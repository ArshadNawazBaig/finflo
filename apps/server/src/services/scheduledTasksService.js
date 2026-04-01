const cron = require('node-cron');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Repayment = require('../models/Repayment');
const Notification = require('../models/Notification');
const SystemSettings = require('../models/SystemSettings');
const { generateAmortizationSchedule } = require('../utils/amortizationUtils');
const {
  createTransactionNotification,
} = require('../utils/notificationHelper');

// ─── Fallback Constants (used only if SystemSettings fails) ─────────────────
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const DEFAULT_LATE_FEE_CAP_PCT = 0.2; // never exceed 20% of remaining balance

/**
 * Fetch late fee configuration from SystemSettings with safe fallbacks.
 */
const getLateFeeConfig = async () => {
  try {
    const settings = await SystemSettings.getSettings();
    return {
      enabled: settings.lateFeeEnabled !== false,
      type: settings.lateFeeType || 'fixed',
      rate: settings.lateFeeRate ?? 500,
      gracePeriodDays: settings.lateFeeGracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS,
      capPct: DEFAULT_LATE_FEE_CAP_PCT,
    };
  } catch (err) {
    console.error('[CRON] Failed to fetch SystemSettings, using defaults:', err.message);
    return {
      enabled: true,
      type: 'fixed',
      rate: 500,
      gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
      capPct: DEFAULT_LATE_FEE_CAP_PCT,
    };
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return how many calendar days between two dates (d2 - d1). */
const daysBetween = (d1, d2) => {
  const diff =
    new Date(d2).setHours(0, 0, 0, 0) - new Date(d1).setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Find the earliest unpaid due date for an active loan.
 * Returns null when all installments are paid or loan has no schedule.
 */
const getNextDueDate = (loan) => {
  try {
    const schedule = generateAmortizationSchedule(loan);
    const paidCount = Math.floor((loan.paidAmount || 0) / loan.emi);
    const unpaid = schedule.filter((s) => s.installment > paidCount);
    return unpaid.length > 0 ? new Date(unpaid[0].dueDate) : null;
  } catch {
    return null;
  }
};

// ─── Job 1: Overdue Status Downgrade ─────────────────────────────────────────
/**
 * Runs daily at 00:05.
 * Marks active loans as 'overdue' when their next payment due date
 * has passed the grace period with no repayment.
 */
const runOverdueDowngrade = async () => {
  console.log('[CRON] runOverdueDowngrade: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const config = await getLateFeeConfig();
    const gracePeriodDays = config.gracePeriodDays;

    const activeLoans = await Loan.find({
      status: 'active',
    }).populate('customer');

    let downgraded = 0;

    for (const loan of activeLoans) {
      const nextDue = getNextDueDate(loan);
      if (!nextDue) continue;

      const daysLate = daysBetween(nextDue, today);
      if (daysLate <= gracePeriodDays) continue;

      // Downgrade to overdue
      await Loan.findByIdAndUpdate(loan._id, {
        status: 'overdue',
        overdueAt: loan.overdueAt || new Date(),
      });

      downgraded++;

      // Notify member if applicable
      try {
        const customer = await Customer.findById(loan.customer);
        if (customer?.isMember && customer.memberId) {
          await createTransactionNotification({
            recipientId: customer.memberId,
            title: '⚠️ Loan Payment Overdue',
            message: `Your loan #${loan._id.toString().slice(-6).toUpperCase()} is now overdue by ${daysLate - gracePeriodDays} day(s). Please make a payment as soon as possible to avoid additional late fees.`,
            type: 'warning',
            branchId: loan.branchId,
            action: 'loan_overdue_notification',
            metadata: { loanId: loan._id, link: '/member/loans' },
          });
        }
      } catch (notifErr) {
        console.error('[CRON] Overdue notification error:', notifErr.message);
      }
    }

    console.log(
      `[CRON] runOverdueDowngrade: ${downgraded} loan(s) marked overdue (grace: ${gracePeriodDays}d).`,
    );
  } catch (err) {
    console.error('[CRON] runOverdueDowngrade ERROR:', err);
  }
};

// ─── Job 2: Late Fee Accrual ──────────────────────────────────────────────────
/**
 * Runs daily at 01:00.
 * Adds daily-prorated late fees to loans that are overdue.
 * Fee = (EMI × 2% / 30) per day overdue beyond the grace period.
 * Capped at 20% of remaining balance.
 */
const runLateFeeAccrual = async () => {
  console.log('[CRON] runLateFeeAccrual: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const config = await getLateFeeConfig();

    // Respect the lateFeeEnabled toggle from admin settings
    if (!config.enabled) {
      console.log('[CRON] runLateFeeAccrual: late fees disabled in settings. Skipping.');
      return;
    }

    const overdueLoans = await Loan.find({
      status: { $in: ['active', 'overdue'] },
    });

    let processed = 0;

    for (const loan of overdueLoans) {
      const nextDue = getNextDueDate(loan);
      if (!nextDue) continue;

      const daysLate = daysBetween(nextDue, today);
      if (daysLate <= config.gracePeriodDays) continue;

      // Calculate daily fee based on configured type
      let dailyFee;
      if (config.type === 'percentage') {
        // Percentage of EMI, prorated daily (e.g., rate=2 means 2% of EMI per month)
        dailyFee = Math.round((loan.emi * config.rate / 100) / 30);
      } else {
        // Fixed amount, prorated daily (e.g., rate=500 means Rs.500 per month)
        dailyFee = Math.round(config.rate / 30);
      }

      const maxFee = Math.round(loan.remainingAmount * config.capPct);
      const currentAccrued = loan.lateFeeAmount || 0;

      if (currentAccrued >= maxFee) continue; // Already at cap

      const applicableFee = Math.min(dailyFee, maxFee - currentAccrued);
      if (applicableFee <= 0) continue;

      // Atomic update with daily de-duplication
      const updatedLoan = await Loan.findOneAndUpdate(
        {
          _id: loan._id,
          $or: [
            { lateFeeAppliedAt: { $exists: false } },
            { lateFeeAppliedAt: { $lt: today } },
          ],
        },
        {
          $inc: { lateFeeAmount: applicableFee },
          $set: { lateFeeAppliedAt: new Date() },
        },
        { new: true },
      );
      if (!updatedLoan) continue;

      processed++;
    }

    console.log(
      `[CRON] runLateFeeAccrual: late fees applied to ${processed} loan(s) (type: ${config.type}, rate: ${config.rate}, grace: ${config.gracePeriodDays}d).`,
    );
  } catch (err) {
    console.error('[CRON] runLateFeeAccrual ERROR:', err);
  }
};

// ─── Job 3: Enhanced Repayment Reminders ─────────────────────────────────────
/**
 * Runs daily at 09:00.
 * Sends in-app notifications for upcoming EMIs: 7 days before AND 1 day before.
 * This complements the existing FinFlo email reminder (which covers 3-day reminders).
 */
const runRepaymentReminders = async () => {
  console.log('[CRON] runRepaymentReminders: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const activeLoans = await Loan.find({
      status: { $in: ['active', 'overdue'] },
    }).populate('customer');

    let sent = 0;

    for (const loan of activeLoans) {
      if (!loan.customer) continue;

      const schedule = generateAmortizationSchedule(loan);
      const paidCount = Math.floor((loan.paidAmount || 0) / loan.emi);

      for (const item of schedule) {
        if (item.installment <= paidCount) continue;

        const dueDate = new Date(item.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = daysBetween(today, dueDate);

        const shouldRemind = daysUntilDue === 7 || daysUntilDue === 1;
        if (!shouldRemind) continue;

        const reminderKey = `reminder_${daysUntilDue}d_inst${item.installment}`;
        
        // De-dupe: check if already sent in this run (per instance) or in DB
        const customer = await Customer.findById(loan.customer);
        if (!customer?.isMember || !customer.memberId) continue;

        // Atomic check and push to prevent multiple instances from sending
        const updatedLoan = await Loan.findOneAndUpdate(
          {
            _id: loan._id,
            'automatedReminders.type': { $ne: reminderKey },
          },
          {
            $push: {
              automatedReminders: {
                type: reminderKey,
                installmentNumber: item.installment,
                sentAt: new Date(),
              },
            },
          },
          { new: true },
        );

        if (!updatedLoan) continue;

        const label = daysUntilDue === 7 ? 'in 7 days' : 'tomorrow';
        await createTransactionNotification({
          recipientId: customer.memberId,
          title: `📅 Upcoming EMI Reminder`,
          message: `Your loan installment #${item.installment} of Rs. ${item.amount.toLocaleString()} is due ${label} (${new Date(item.dueDate).toLocaleDateString()}).`,
          type: 'info',
          branchId: loan.branchId,
          action: 'upcoming_emi_reminder',
          metadata: { loanId: loan._id, link: '/member/loans' },
        });

        sent++;
        break; // Only look at the next unpaid installment per loan
      }
    }

    console.log(`[CRON] runRepaymentReminders: ${sent} reminder(s) sent.`);
  } catch (err) {
    console.error('[CRON] runRepaymentReminders ERROR:', err);
  }
};

// ─── Job 4: Trust Rating Recalculation ───────────────────────────────────────
/**
 * Runs weekly on Sunday at 02:00.
 * Recalculates trust rating for every customer from scratch based on their
 * full repayment history. This is a corrective measure to fix any drift
 * and also account for loan completions.
 */
const runTrustRatingRecalc = async () => {
  console.log('[CRON] runTrustRatingRecalc: starting...');

  try {
    const customers = await Customer.find({});
    let processed = 0;

    for (const customer of customers) {
      const loans = await Loan.find({ customer: customer._id });
      if (loans.length === 0) continue;

      let totalScore = 5.0; // Start from a neutral baseline

      for (const loan of loans) {
        if (
          !['active', 'overdue', 'completed', 'defaulted'].includes(loan.status)
        )
          continue;

        const repayments = await Repayment.find({ loan: loan._id }).sort({
          date: 1,
        });
        if (repayments.length === 0) continue;

        const schedule = generateAmortizationSchedule(loan);

        for (const repayment of repayments) {
          const installmentNumber = Math.ceil(repayment.amount / loan.emi);
          const schedItem = schedule.find(
            (s) => s.installment === installmentNumber,
          );
          if (!schedItem) continue;

          const dueDate = new Date(schedItem.dueDate);
          const graceDue = new Date(dueDate);
          graceDue.setDate(graceDue.getDate() + GRACE_PERIOD_DAYS);

          const paymentDate = new Date(repayment.date);
          const isOnTime = paymentDate <= graceDue;
          totalScore += isOnTime ? 0.2 : -0.5;
        }

        // Bonus for fully paid loans
        if (loan.status === 'completed') totalScore += 1.0;
        // Penalty for defaults
        if (loan.status === 'defaulted') totalScore -= 2.0;
        // Penalty for overdue loans
        if (loan.status === 'overdue') totalScore -= 0.5;
      }

      const newRating = Math.min(
        10,
        Math.max(0, Math.round(totalScore * 10) / 10),
      );
      await Customer.findByIdAndUpdate(customer._id, {
        trustRating: newRating,
      });
      processed++;
    }

    console.log(
      `[CRON] runTrustRatingRecalc: recalculated ${processed} customer(s).`,
    );
  } catch (err) {
    console.error('[CRON] runTrustRatingRecalc ERROR:', err);
  }
};

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
    const User = require('../models/User');
    const Member = require('../models/Member');
    const Investment = require('../models/Investment');
    const ProfitDistribution = require('../models/ProfitDistribution');
    const FinancialTransaction = require('../models/FinancialTransaction');

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
        const dailyProfit = Math.round(member.savingBalance * dailyRate);
        if (dailyProfit <= 0) continue;

        // Atomic update with daily de-duplication
        const updatedMember = await Member.findOneAndUpdate(
          {
            _id: member._id,
            $or: [
              { lastSavingProfitAt: { $exists: false } },
              { lastSavingProfitAt: { $lt: today } },
            ],
          },
          {
            $inc: {
              pendingSavingProfit: dailyProfit,
            },
            $set: { lastSavingProfitAt: new Date() },
          },
          { new: true },
        );

        if (!updatedMember) continue;

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
    const User = require('../models/User');
    const Member = require('../models/Member');
    const Investment = require('../models/Investment');
    const ProfitDistribution = require('../models/ProfitDistribution');
    const FinancialTransaction = require('../models/FinancialTransaction');

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

        // Create Financial Transaction
        await new FinancialTransaction({
          user: admin._id,
          branchId: member.branchId,
          type: 'expense',
          category: 'saving_profit',
          amount: distributedProfit,
          date: new Date(),
          description: `Monthly saving profit for ${member.name}`,
          member: member._id,
          referenceId: investment._id,
          referenceModel: 'Investment',
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
  }
};

// ─── Initializer ─────────────────────────────────────────────────────────────

const initScheduledTasks = () => {
  // Job 1: Mark overdue loans daily at 00:05
  cron.schedule('5 0 * * *', runOverdueDowngrade, { timezone: 'Asia/Karachi' });

  // Job 2: Apply late fees daily at 01:00
  cron.schedule('0 1 * * *', runLateFeeAccrual, { timezone: 'Asia/Karachi' });

  // Job 3: Send repayment reminders daily at 09:00
  cron.schedule('0 9 * * *', runRepaymentReminders, {
    timezone: 'Asia/Karachi',
  });

  // Job 4: Recalculate trust ratings every Sunday at 02:00
  cron.schedule('0 2 * * 0', runTrustRatingRecalc, {
    timezone: 'Asia/Karachi',
  });

  // Job 5: Daily saving profit accrual at 02:30
  cron.schedule('30 2 * * *', runSavingProfitAccrual, {
    timezone: 'Asia/Karachi',
  });

  // Job 6: Monthly saving profit distribution at 03:00 on the 1st of every month
  cron.schedule('0 3 1 * *', runMonthlySavingProfitDistribution, {
    timezone: 'Asia/Karachi',
  });

  console.log('[CRON] Scheduled Tasks Engine initialized. 6 jobs registered.');
};

module.exports = {
  initScheduledTasks,
  // Export runners for direct testing/invocation
  runOverdueDowngrade,
  runLateFeeAccrual,
  runRepaymentReminders,
  runTrustRatingRecalc,
  runSavingProfitAccrual,
  runMonthlySavingProfitDistribution,
};
