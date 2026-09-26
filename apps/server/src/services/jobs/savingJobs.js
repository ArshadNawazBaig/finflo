const cron = require('node-cron');
const Loan = require('../../models/Loan');
const Customer = require('../../models/Customer');
const Repayment = require('../../models/Repayment');
const Notification = require('../../models/Notification');
const SystemSettings = require('../../models/SystemSettings');
const FinancialTransaction = require('../../models/FinancialTransaction');
const { generateAmortizationSchedule } = require('../../utils/amortizationUtils');
const {
  createTransactionNotification,
} = require('../../utils/notificationHelper');
const { wrap } = require('../jobHealth');
const logger = require('../../utils/logger');

// ─── Fallback Constants (used only if config fails) ─────────────────────────
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const DEFAULT_LATE_FEE_CAP_PCT = 0.2; // never exceed 20% of remaining balance
// ─── Job 5: Daily Saving Account Profit Accrual ─────────────────────────────
/**
 * Runs daily at 02:00.
 * For each admin with a savingProfitRate > 0, applies daily prorated profit
 * to every active member's saving balance.
 * Daily Profit = savingBalance × (annualRate / 100 / 365)
 */
const runSavingProfitAccrual = async () => {
  console.log('[CRON] runSavingProfitAccrual: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const User = require('../../models/User');
    const Member = require('../../models/Member');
    const Investment = require('../../models/Investment');
    const ProfitDistribution = require('../../models/ProfitDistribution');
    const FinancialTransaction = require('../../models/FinancialTransaction');

    // Find all admin users with saving profit rate > 0
    const admins = await User.find({
      role: { $in: ['admin'] },
      savingProfitRate: { $gt: 0 },
      isActive: true,
    });

    if (admins.length === 0) {
      console.log('[CRON] runSavingProfitAccrual: no admins with saving profit rate. Skipping.');
      return;
    }

    let totalProcessed = 0;
    let totalProfitDistributed = 0;

    for (const admin of admins) {
      const annualRate = admin.savingProfitRate;
      const dailyRate = annualRate / 100 / 365;

      // Find all active members belonging to this admin with saving balance >= 10000
      const members = await Member.find({
        user: admin._id,
        status: 'Active',
        savingBalance: { $gte: 10000 },
      });

      if (members.length === 0) continue;

      const period = today.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      for (const member of members) {
        // Use an aggregation pipeline so the profit is computed from the
        // *current* savingBalance at write time, not the value we read into
        // memory at the start of the loop. Otherwise a concurrent
        // withdrawal between the read and the write would credit interest
        // on funds the member has already pulled out.
        const updatedMember = await Member.findOneAndUpdate(
          {
            _id: member._id,
            savingBalance: { $gte: 10000 },
            $or: [
              { lastSavingProfitAt: { $exists: false } },
              { lastSavingProfitAt: { $lt: today } },
            ],
          },
          [
            {
              $set: {
                pendingSavingProfit: {
                  $add: [
                    { $ifNull: ['$pendingSavingProfit', 0] },
                    {
                      // Keep 2 dp (paisa) so sub-rupee daily profit isn't lost;
                      // it accumulates and is paid out monthly.
                      $round: [
                        { $multiply: ['$savingBalance', dailyRate] },
                        2,
                      ],
                    },
                  ],
                },
                lastSavingProfitAt: new Date(),
              },
            },
          ],
          { new: true, updatePipeline: true },
        );

        if (!updatedMember) continue;

        const dailyProfit =
          Math.round(updatedMember.savingBalance * dailyRate * 100) / 100;
        if (dailyProfit <= 0) continue;

        // Daily accruals no longer create ledger entries immediately;
        // they are stored as pendingSavingProfit and distributed monthly.

        totalProcessed++;
        totalProfitDistributed += dailyProfit;
      }
    }

    console.log(
      `[CRON] runSavingProfitAccrual: distributed profit to ${totalProcessed} member(s). Total: ${totalProfitDistributed}`,
    );
  } catch (err) {
    console.error('[CRON] runSavingProfitAccrual ERROR:', err);
    throw err;
  }
};

// ─── Job 6: Monthly Saving Account Profit Distribution ────────────────────────
/**
 * Runs monthly on the 1st at 03:00.
 * Distributes the accumulated `pendingSavingProfit` to members' saving balances,
 * and creates the corresponding real ledger entries for the entire month's worth of profit.
 */
const runMonthlySavingProfitDistribution = async () => {
  console.log('[CRON] runMonthlySavingProfitDistribution: starting...');
  const today = new Date();

  try {
    const User = require('../../models/User');
    const Member = require('../../models/Member');
    const Investment = require('../../models/Investment');
    const ProfitDistribution = require('../../models/ProfitDistribution');
    const FinancialTransaction = require('../../models/FinancialTransaction');

    // Find all admin users with saving profit rate > 0
    const admins = await User.find({
      role: { $in: ['admin'] },
      savingProfitRate: { $gt: 0 },
      isActive: true,
    });

    if (admins.length === 0) {
      console.log('[CRON] runMonthlySavingProfit: no admins found. Skipping.');
      return;
    }

    let totalProcessed = 0;
    let totalProfitDistributed = 0;

    for (const admin of admins) {
      const annualRate = admin.savingProfitRate;

      // Find all active members with accumulated pending profit
      const members = await Member.find({
        user: admin._id,
        status: 'Active',
        pendingSavingProfit: { $gt: 0 },
      });

      if (members.length === 0) continue;

      // Label as the previous month, e.g., "Feb 2026"
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const period = prevMonth.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      for (const member of members) {
        const distributedProfit = member.pendingSavingProfit;

        // Atomic update verifying the pending amount matches, effectively resetting it
        const updatedMember = await Member.findOneAndUpdate(
          { _id: member._id, pendingSavingProfit: distributedProfit },
          {
            $inc: {
              savingBalance: distributedProfit,
              totalSavingProfit: distributedProfit,
            },
            $set: { pendingSavingProfit: 0 },
          },
          { new: true }
        );

        if (!updatedMember) continue;

        // Create investment record for the profit
        const investment = await Investment.create({
          user: admin._id,
          member: member._id,
          branchId: member.branchId,
          type: 'profit',
          accountType: 'saving',
          amount: distributedProfit,
          description: `Monthly saving profit distribution (${annualRate}% annual)`,
          balanceAfter: updatedMember.savingBalance,
        });

        // Create ProfitDistribution record
        await ProfitDistribution.create({
          user: admin._id,
          member: member._id,
          branchId: member.branchId,
          amount: distributedProfit,
          type: 'saving',
          period,
          description: `Monthly saving profit distribution at ${annualRate}% annual rate`,
          calculationMethod: 'daily_accumulated',
          investmentSharePercent: annualRate,
        });

        // Create Financial Transaction. Use category 'profit_distribution'
        // to stay consistent with the regular/share profit code paths in
        // memberController — this is the category every P&L/Balance-Sheet
        // aggregator excludes from operating expenses (the payout is already
        // accounted for via the ProfitDistribution document above). Using a
        // different label (the legacy 'saving_profit') made these rows leak
        // into operating-expense rollups and double-counted them against net
        // income.
        await new FinancialTransaction({
          user: admin._id,
          branchId: member.branchId,
          type: 'expense',
          category: 'profit_distribution',
          amount: distributedProfit,
          date: new Date(),
          description: `Monthly saving profit for ${member.name}`,
          member: member._id,
          referenceId: investment._id,
          referenceModel: 'Investment',
          paymentMethod: 'online',
        }).save();

        totalProcessed++;
        totalProfitDistributed += distributedProfit;
      }
    }

    console.log(
      `[CRON] runMonthlySavingProfitDistribution: distributed profit to ${totalProcessed} member(s). Total: ${totalProfitDistributed}`,
    );
  } catch (err) {
    console.error('[CRON] runMonthlySavingProfitDistribution ERROR:', err);
    throw err;
  }
};

module.exports = {
  runSavingProfitAccrual,
  runMonthlySavingProfitDistribution,
};
