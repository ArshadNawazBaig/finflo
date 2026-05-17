const cron = require('node-cron');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Repayment = require('../models/Repayment');
const Notification = require('../models/Notification');
const SystemSettings = require('../models/SystemSettings');
const FinancialTransaction = require('../models/FinancialTransaction');
const { generateAmortizationSchedule } = require('../utils/amortizationUtils');
const {
  createTransactionNotification,
} = require('../utils/notificationHelper');

// ─── Fallback Constants (used only if config fails) ─────────────────────────
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const DEFAULT_LATE_FEE_CAP_PCT = 0.2; // never exceed 20% of remaining balance

/**
 * Fetch late fee configuration from a specific admin User with safe fallbacks.
 */
const getLateFeeConfig = async (adminUserId) => {
  try {
    const User = require('../models/User');
    const adminUser = await User.findById(adminUserId).select(
      'lateFeeEnabled lateFeeType lateFeeRate lateFeeGracePeriodDays'
    );
    if (!adminUser) throw new Error('Admin user not found');
    return {
      enabled: adminUser.lateFeeEnabled === true,
      type: adminUser.lateFeeType || 'fixed',
      rate: adminUser.lateFeeRate ?? 0,
      gracePeriodDays: adminUser.lateFeeGracePeriodDays ?? 0,
      capPct: DEFAULT_LATE_FEE_CAP_PCT,
    };
  } catch (err) {
    console.error('[CRON] Failed to fetch admin config, using defaults:', err.message);
    return {
      enabled: false,
      type: 'fixed',
      rate: 0,
      gracePeriodDays: 0,
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
 * Now processes each business's loans with that business's own grace period.
 */
const runOverdueDowngrade = async () => {
  console.log('[CRON] runOverdueDowngrade: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const User = require('../models/User');
    const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id');

    let totalDowngraded = 0;

    for (const admin of adminUsers) {
      const config = await getLateFeeConfig(admin._id);
      const gracePeriodDays = config.gracePeriodDays;

      const activeLoans = await Loan.find({
        user: admin._id,
        status: 'active',
      }).populate('customer');

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

        totalDowngraded++;

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
    }

    console.log(
      `[CRON] runOverdueDowngrade: ${totalDowngraded} loan(s) marked overdue.`,
    );
  } catch (err) {
    console.error('[CRON] runOverdueDowngrade ERROR:', err);
  }
};

// ─── Job 2: Late Fee Accrual ──────────────────────────────────────────────────
/**
 * Runs daily at 01:00.
 * Adds daily-prorated late fees to loans that are overdue.
 * Now processes each business's loans with that business's own config.
 * Capped at 20% of remaining balance.
 */
const runLateFeeAccrual = async () => {
  console.log('[CRON] runLateFeeAccrual: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const User = require('../models/User');
    const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id');

    let totalProcessed = 0;

    for (const admin of adminUsers) {
      const config = await getLateFeeConfig(admin._id);

      // Respect the lateFeeEnabled toggle from this business's settings
      if (!config.enabled) continue;

      const overdueLoans = await Loan.find({
        user: admin._id,
        status: { $in: ['active', 'overdue'] },
      });

      for (const loan of overdueLoans) {
        // ── Only accrue late fees AFTER the full loan tenure has expired ──
        const startDate = new Date(loan.startDate);
        const tenureEndDate = new Date(startDate);
        tenureEndDate.setMonth(tenureEndDate.getMonth() + loan.duration);

        // If we haven't passed the loan tenure end date, skip
        if (today <= tenureEndDate) continue;

        // If the loan is fully paid, skip
        if (loan.remainingAmount <= 0) continue;

        // Check grace period after tenure end
        const graceDeadline = new Date(tenureEndDate);
        graceDeadline.setDate(graceDeadline.getDate() + config.gracePeriodDays);
        if (today <= graceDeadline) continue;

        // Calculate daily fee based on configured type
        let dailyFee;
        if (config.type === 'percentage') {
          dailyFee = Math.round((loan.emi * config.rate / 100) / 30);
        } else {
          dailyFee = Math.round(config.rate / 30);
        }

        const maxFee = Math.round(loan.remainingAmount * config.capPct);
        const currentAccrued = loan.lateFeeAmount || 0;

        if (currentAccrued >= maxFee) continue; // Already at cap

        const applicableFee = Math.min(dailyFee, maxFee - currentAccrued);
        if (applicableFee <= 0) continue;

        // Atomic update with daily de-duplication.
        // Late fees must flow through to the outstanding balance so the
        // borrower actually pays them on the next repayment — otherwise
        // lateFeeAmount accrues silently while remainingAmount stays static.
        const updatedLoan = await Loan.findOneAndUpdate(
          {
            _id: loan._id,
            $or: [
              { lateFeeAppliedAt: { $exists: false } },
              { lateFeeAppliedAt: { $lt: today } },
            ],
          },
          {
            $inc: {
              lateFeeAmount: applicableFee,
              remainingAmount: applicableFee,
              totalAmount: applicableFee,
            },
            $set: { lateFeeAppliedAt: new Date() },
          },
          { new: true },
        );
        if (!updatedLoan) continue;

        // Record the daily accrual as income for the business so it shows
        // up in P&L / Reports alongside the manual `applyLateFees` path.
        // (The other late-fee code path in `lateFeeService.js` already
        // writes this; without it here, the cron's accruals were invisible
        // to the books until repayment.)
        try {
          await FinancialTransaction.create({
            user: loan.user,
            branchId: loan.branchId,
            type: 'income',
            category: 'late_fee',
            amount: applicableFee,
            date: new Date(),
            description: `Late fee accrual for loan #${loan._id.toString().slice(-6).toUpperCase()}`,
            customer: loan.customer,
            loan: loan._id,
            referenceId: loan._id,
            referenceModel: 'Loan',
            paymentMethod: 'online',
          });
        } catch (ftErr) {
          console.error(
            `[CRON] runLateFeeAccrual: FinancialTransaction failed for loan ${loan._id}:`,
            ftErr.message,
          );
        }

        totalProcessed++;
      }
    }

    console.log(
      `[CRON] runLateFeeAccrual: late fees applied to ${totalProcessed} loan(s).`,
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
          // Prefer the installmentNumber recorded at repayment time —
          // ceil(amount/emi) misclassifies partial/over-payments (e.g. a
          // 500 payment when EMI is 1000 maps to installment 1 regardless
          // of which installment was actually due).
          const installmentNumber =
            repayment.installmentNumber ||
            Math.ceil((repayment.amount || 0) / (loan.emi || 1));
          const schedItem = schedule.find(
            (s) => s.installment === installmentNumber,
          );
          if (!schedItem) continue;

          const dueDate = new Date(schedItem.dueDate);
          const graceDue = new Date(dueDate);
          graceDue.setDate(graceDue.getDate() + DEFAULT_GRACE_PERIOD_DAYS);

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
                      $round: [
                        { $multiply: ['$savingBalance', dailyRate] },
                        0,
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

        const dailyProfit = Math.round(updatedMember.savingBalance * dailyRate);
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
  }
};

// ─── Job 7: Loan Default Detection ───────────────────────────────────────────
/**
 * Runs daily at 01:30.
 * Automatically marks overdue loans as 'defaulted' when they exceed the
 * admin's configured threshold (months after tenure end).
 * Consequences: member account freeze, trust rating drop, notifications.
 */
const runLoanDefaultDetection = async () => {
  console.log('[CRON] runLoanDefaultDetection: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const User = require('../models/User');
    const Member = require('../models/Member');
    const { logActivity } = require('../controllers/activityLogController');

    const adminUsers = await User.find({ role: 'admin', isActive: true }).select(
      '_id loanDefaultThresholdMonths'
    );

    let totalDefaulted = 0;

    for (const admin of adminUsers) {
      const thresholdMonths = admin.loanDefaultThresholdMonths ?? 3;

      // Find overdue loans (not yet defaulted) for this business
      const overdueLoans = await Loan.find({
        user: admin._id,
        status: 'overdue',
      }).populate('customer', 'name email memberId isMember');

      for (const loan of overdueLoans) {
        try {
          // Calculate the loan's tenure end date
          const startDate = new Date(loan.startDate);
          const tenureEndDate = new Date(startDate);
          tenureEndDate.setMonth(tenureEndDate.getMonth() + loan.duration);

          // Calculate the default deadline: tenure end + threshold months
          const defaultDeadline = new Date(tenureEndDate);
          defaultDeadline.setMonth(defaultDeadline.getMonth() + thresholdMonths);

          // If we haven't passed the default deadline, skip
          if (today <= defaultDeadline) continue;

          // If the loan is fully paid, skip (shouldn't be overdue, but safe guard)
          if (loan.remainingAmount <= 0) continue;

          // ── Mark the loan as defaulted ──
          await Loan.findByIdAndUpdate(loan._id, {
            status: 'defaulted',
            defaultedAt: new Date(),
            defaultReason: `Auto-defaulted: ${thresholdMonths} month(s) past tenure end with outstanding balance of ${loan.remainingAmount}`,
          });

          totalDefaulted++;

          // ── Freeze member account if applicable ──
          if (loan.customer?.isMember && loan.customer.memberId) {
            await Member.findByIdAndUpdate(loan.customer.memberId, {
              status: 'Inactive',
            });
          }

          // ── Notify member ──
          if (loan.customer?.isMember && loan.customer.memberId) {
            try {
              await createTransactionNotification({
                recipientId: loan.customer.memberId,
                title: '🚨 Loan Defaulted',
                message: `Your loan #${loan._id.toString().slice(-6).toUpperCase()} has been marked as defaulted due to non-payment ${thresholdMonths} month(s) after the loan period ended. Your account has been frozen. Please contact admin immediately.`,
                type: 'error',
                branchId: loan.branchId,
                action: 'loan_defaulted',
                metadata: { loanId: loan._id, link: '/member/loans' },
              });
            } catch (notifErr) {
              console.error('[CRON] Default notification error (member):', notifErr.message);
            }
          }

          // ── Notify admin ──
          try {
            await Notification.create({
              recipient: admin._id,
              recipientModel: 'User',
              title: '🚨 Loan Auto-Defaulted',
              message: `Loan #${loan._id.toString().slice(-6).toUpperCase()} for ${loan.customer?.name || 'Unknown'} has been automatically defaulted after ${thresholdMonths} month(s) past tenure. Outstanding: ${loan.remainingAmount}.`,
              type: 'error',
              action: 'loan_auto_defaulted',
            });
          } catch (notifErr) {
            console.error('[CRON] Default notification error (admin):', notifErr.message);
          }

          // ── Notify grantors if they exist ──
          try {
            const fullLoan = await Loan.findById(loan._id).select('grantor1 grantor2');
            const grantorIds = [fullLoan.grantor1, fullLoan.grantor2].filter(Boolean);
            for (const grantorId of grantorIds) {
              await createTransactionNotification({
                recipientId: grantorId,
                title: '⚠️ Guaranteed Loan Defaulted',
                message: `A loan you guaranteed (#${loan._id.toString().slice(-6).toUpperCase()}) for ${loan.customer?.name || 'Unknown'} has been defaulted. Outstanding: ${loan.remainingAmount}.`,
                type: 'warning',
                branchId: loan.branchId,
                action: 'grantor_loan_defaulted',
                metadata: { loanId: loan._id, link: '/member/grantor-requests' },
              });
            }
          } catch (grantorErr) {
            console.error('[CRON] Grantor default notification error:', grantorErr.message);
          }

          // ── Log activity ──
          try {
            await logActivity({
              userId: admin._id,
              action: 'loan_auto_defaulted',
              category: 'loan',
              details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} for ${loan.customer?.name || 'Unknown'} auto-defaulted after ${thresholdMonths} month(s) past tenure. Outstanding: ${loan.remainingAmount}`,
              metadata: { loanId: loan._id, remainingAmount: loan.remainingAmount },
            });
          } catch (logErr) {
            console.error('[CRON] Default activity log error:', logErr.message);
          }

          // ── Drop trust rating ──
          if (loan.customer?._id) {
            try {
              const customer = await Customer.findById(loan.customer._id);
              if (customer) {
                const newRating = Math.max(0, (customer.trustRating || 5) - 3.0);
                await Customer.findByIdAndUpdate(customer._id, {
                  trustRating: Math.round(newRating * 10) / 10,
                });
              }
            } catch (ratingErr) {
              console.error('[CRON] Trust rating update error:', ratingErr.message);
            }
          }
        } catch (loanErr) {
          console.error(`[CRON] Error defaulting loan ${loan._id}:`, loanErr.message);
        }
      }
    }

    console.log(
      `[CRON] runLoanDefaultDetection: ${totalDefaulted} loan(s) auto-defaulted.`,
    );
  } catch (err) {
    console.error('[CRON] runLoanDefaultDetection ERROR:', err);
  }
};

// ─── Job 8: Compound Interest Accrual ────────────────────────────────────────
/**
 * Runs daily at 00:30.
 * For compound-interest loans with missed installments, adds the unpaid
 * interest to the outstanding balance (totalAmount & remainingAmount).
 * This makes the borrower pay interest-on-interest for missed payments.
 * De-duplicated daily via lastCompoundedAt.
 */
const runCompoundInterestAccrual = async () => {
  console.log('[CRON] runCompoundInterestAccrual: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Only process compound-interest loans that are active or overdue
    const compoundLoans = await Loan.find({
      interestType: 'compound',
      status: { $in: ['active', 'overdue'] },
      remainingAmount: { $gt: 0 },
    }).populate('customer', 'name memberId isMember');

    let totalCompounded = 0;

    for (const loan of compoundLoans) {
      try {
        // Calculate which installment should be paid by now.
        // Installment due dates are calendar-month offsets from startDate
        // (Loan creation uses setMonth(+i)), so we must measure elapsed time
        // in real calendar months — NOT 30-day approximations, which drift
        // and fire compounding a few days before the borrower is actually late.
        const startDate = new Date(loan.startDate);
        let monthsSinceStart =
          (today.getFullYear() - startDate.getFullYear()) * 12 +
          (today.getMonth() - startDate.getMonth());
        if (today.getDate() < startDate.getDate()) monthsSinceStart -= 1;
        monthsSinceStart = Math.max(0, monthsSinceStart);

        // How many installments have been paid
        const installmentsPaid = Math.floor(
          ((loan.paidAmount || 0) + 0.5) / (loan.emi || 1)
        );

        // If the borrower is up to date, no compounding needed
        if (installmentsPaid >= monthsSinceStart) continue;

        // Calculate one month's interest on the current remaining balance
        const monthlyInterest = Math.round(
          (loan.remainingAmount * loan.rate) / 1200
        );

        if (monthlyInterest <= 0) continue;

        // Daily de-duplication: only compound once per day
        const updatedLoan = await Loan.findOneAndUpdate(
          {
            _id: loan._id,
            $or: [
              { lastCompoundedAt: { $exists: false } },
              { lastCompoundedAt: null },
              { lastCompoundedAt: { $lt: today } },
            ],
          },
          {
            $inc: {
              totalAmount: monthlyInterest,
              remainingAmount: monthlyInterest,
              compoundedAmount: monthlyInterest,
            },
            $set: { lastCompoundedAt: new Date() },
          },
          { new: true }
        );

        if (!updatedLoan) continue;

        totalCompounded++;

        // Notify member about compounded interest
        if (loan.customer?.isMember && loan.customer?.memberId) {
          try {
            await createTransactionNotification({
              recipientId: loan.customer.memberId,
              title: '📈 Interest Compounded',
              message: `Rs. ${monthlyInterest.toLocaleString()} interest has been added to your loan #${loan._id.toString().slice(-6).toUpperCase()} balance due to a missed installment. New outstanding: Rs. ${updatedLoan.remainingAmount.toLocaleString()}.`,
              type: 'warning',
              branchId: loan.branchId,
              action: 'compound_interest_accrual',
              metadata: { loanId: loan._id, link: '/member/loans' },
            });
          } catch (notifErr) {
            console.error('[CRON] Compound interest notification error:', notifErr.message);
          }
        }
      } catch (loanErr) {
        console.error(`[CRON] Error compounding loan ${loan._id}:`, loanErr.message);
      }
    }

    console.log(
      `[CRON] runCompoundInterestAccrual: compounded interest on ${totalCompounded} loan(s).`
    );
  } catch (err) {
    console.error('[CRON] runCompoundInterestAccrual ERROR:', err);
  }
};

// ─── Job 9: Recurring Scheduled Payments ─────────────────────────────────────
/**
 * Runs daily at 06:00.
 * Processes active scheduled payments (monthly) where nextExecutionDate <= today.
 * Supports saving_deposit (current→saving transfer) and loan_repayment types.
 */
const runScheduledPayments = async () => {
  console.log('[CRON] runScheduledPayments: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const ScheduledPayment = require('../models/ScheduledPayment');
    const Member = require('../models/Member');
    const Investment = require('../models/Investment');
    const FinancialTransaction = require('../models/FinancialTransaction');

    const duePayments = await ScheduledPayment.find({
      status: 'active',
      nextExecutionDate: { $lte: today },
    }).populate('member', 'name currentBalance savingBalance user branchId');

    let executed = 0;
    let failed = 0;

    for (const payment of duePayments) {
      try {
        const member = await Member.findById(payment.member._id);
        if (!member) {
          payment.status = 'failed';
          payment.failureReason = 'Member not found';
          await payment.save();
          failed++;
          continue;
        }

        const sourceBalance = payment.sourceAccount === 'saving'
          ? member.savingBalance
          : member.currentBalance;

        if (sourceBalance < payment.amount) {
          payment.status = 'failed';
          payment.failureReason = `Insufficient ${payment.sourceAccount} balance (needed ${payment.amount}, had ${sourceBalance})`;
          await payment.save();
          failed++;

          // Notify member of failure
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: '❌ Scheduled Payment Failed',
              message: `Your scheduled ${payment.type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'} of Rs. ${payment.amount.toLocaleString()} failed due to insufficient funds.`,
              type: 'error',
              branchId: member.branchId,
              action: 'scheduled_payment_failed',
              metadata: { scheduledPaymentId: payment._id },
            });
          } catch (notifErr) {
            console.error('[CRON] Scheduled payment notification error:', notifErr.message);
          }
          continue;
        }

        // Execute the payment
        if (payment.type === 'saving_deposit') {
          // Transfer from current/saving to saving
          if (payment.sourceAccount === 'current') {
            member.currentBalance -= payment.amount;
          }
          member.savingBalance += payment.amount;
          member.totalSavingDeposited = (member.totalSavingDeposited || 0) + payment.amount;
          await member.save({ validateBeforeSave: false });

          // Create investment record
          await Investment.create({
            user: member.user,
            member: member._id,
            branchId: member.branchId,
            type: 'deposit',
            accountType: 'saving',
            amount: payment.amount,
            description: `Auto: Scheduled monthly saving deposit`,
            balanceAfter: member.savingBalance,
          });

          await FinancialTransaction.create({
            user: member.user,
            branchId: member.branchId,
            type: 'credit',
            category: 'saving_deposit',
            amount: payment.amount,
            date: new Date(),
            description: `Auto: Scheduled saving deposit for ${member.name}`,
            member: member._id,
            paymentMethod: 'online',
          });
        } else if (payment.type === 'loan_repayment' && payment.loanId) {
          // Delegate to the shared loan repayment service so the repayment
          // is recorded with a proper interest/principal split, a
          // FinancialTransaction, an Investment ledger entry, and the
          // member's trust rating is updated. Doing the bookkeeping inline
          // skipped all of that and left repayments invisible to reports.
          const Loan = require('../models/Loan');
          const Customer = require('../models/Customer');
          const { processRepayment } = require('./loanRepaymentService');

          const loan = await Loan.findById(payment.loanId).populate('customer');
          if (!loan || loan.status === 'completed') {
            payment.status = 'completed';
            payment.failureReason = loan ? 'Loan already completed' : 'Loan not found';
            await payment.save();
            continue;
          }

          // Saving-account repayments aren't currently supported by the
          // service (it always debits currentBalance). Reject those rather
          // than silently double-counting against the wrong account.
          if (payment.sourceAccount && payment.sourceAccount !== 'current') {
            payment.status = 'failed';
            payment.failureReason =
              'Scheduled loan repayments can only be debited from the current account';
            await payment.save();
            failed++;
            continue;
          }

          const repaymentAmount = Math.min(payment.amount, loan.remainingAmount);

          // Build a minimal req-like context so logActivity / branch lookups work.
          const ctx = {
            user: {
              _id: member.user,
              effectiveOwnerId: member.user,
              branchId: member.branchId,
            },
          };

          await processRepayment(loan, repaymentAmount, ctx, {
            date: new Date(),
            notes: 'Automated scheduled loan repayment',
            isAutoValue: true,
            deductFromWallet: true,
            paymentMethod: 'online',
          });
        }

        // Update schedule
        payment.lastExecutedAt = new Date();
        payment.executionCount += 1;

        // Check if max executions reached
        if (payment.maxExecutions && payment.executionCount >= payment.maxExecutions) {
          payment.status = 'completed';
        } else {
          // Schedule next month
          const nextDate = new Date(payment.nextExecutionDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          payment.nextExecutionDate = nextDate;
        }
        payment.failureReason = undefined;
        await payment.save();
        executed++;

        // Notify member of success
        try {
          await createTransactionNotification({
            recipientId: member._id,
            title: '✅ Scheduled Payment Processed',
            message: `Your monthly ${payment.type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'} of Rs. ${payment.amount.toLocaleString()} has been processed successfully.`,
            type: 'success',
            branchId: member.branchId,
            action: 'scheduled_payment_success',
            metadata: { scheduledPaymentId: payment._id },
          });
        } catch (notifErr) {
          console.error('[CRON] Scheduled payment notification error:', notifErr.message);
        }
      } catch (paymentErr) {
        console.error(`[CRON] Error processing scheduled payment ${payment._id}:`, paymentErr.message);
        payment.status = 'failed';
        payment.failureReason = paymentErr.message;
        await payment.save();
        failed++;
      }
    }

    console.log(
      `[CRON] runScheduledPayments: ${executed} executed, ${failed} failed.`,
    );
  } catch (err) {
    console.error('[CRON] runScheduledPayments ERROR:', err);
  }
};

// ─── Job 10: Term Deposit Auto-Maturity ──────────────────────────────────────
/**
 * Runs daily at 04:00.
 * Auto-matures any active term deposit whose maturityDate has been reached.
 * Credits principal + projectedProfit to the member's source account,
 * records the ProfitDistribution and Investment ledger entries, and emits
 * a notification. Previously this required a manual admin action and
 * deposits could sit "active" past maturity, hiding profit liabilities
 * off the books indefinitely.
 */
const runTermDepositAutoMaturity = async () => {
  console.log('[CRON] runTermDepositAutoMaturity: starting...');
  const now = new Date();

  try {
    const TermDeposit = require('../models/TermDeposit');
    const Member = require('../models/Member');
    const Investment = require('../models/Investment');
    const ProfitDistribution = require('../models/ProfitDistribution');

    const dueDeposits = await TermDeposit.find({
      status: 'active',
      maturityDate: { $lte: now },
    });

    let matured = 0;

    for (const deposit of dueDeposits) {
      try {
        const totalReturn = deposit.principal + deposit.projectedProfit;

        const creditFields =
          deposit.sourceAccount === 'saving'
            ? {
                savingBalance: totalReturn,
                totalSavingDeposited: deposit.principal,
                totalSavingProfit: deposit.projectedProfit,
              }
            : {
                currentBalance: totalReturn,
                totalInvested: deposit.principal,
                totalProfit: deposit.projectedProfit,
              };

        // Atomic guard on status so two cron runs can't double-credit.
        const tdUpdate = await TermDeposit.findOneAndUpdate(
          { _id: deposit._id, status: 'active' },
          {
            $set: {
              status: 'matured',
              maturedAt: now,
              actualProfit: deposit.projectedProfit,
            },
          },
          { new: true },
        );
        if (!tdUpdate) continue; // another run already matured it

        const updatedMember = await Member.findByIdAndUpdate(
          deposit.member,
          { $inc: creditFields },
          { new: true },
        );

        if (deposit.projectedProfit > 0) {
          await ProfitDistribution.create({
            user: deposit.user,
            member: deposit.member,
            branchId: deposit.branchId,
            amount: deposit.projectedProfit,
            type: 'term_deposit',
            period: now.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            }),
            calculationMethod: `Auto-matured Term Deposit ${deposit.depositNumber} — ${deposit.principal} × ${deposit.profitRate}% × ${deposit.duration} months`,
            date: now,
          });
        }

        await Investment.create({
          user: deposit.user,
          member: deposit.member,
          branchId: deposit.branchId,
          type: 'deposit',
          accountType: deposit.sourceAccount,
          amount: totalReturn,
          balanceAfter:
            deposit.sourceAccount === 'saving'
              ? updatedMember?.savingBalance
              : updatedMember?.currentBalance,
          description: `Auto-matured Term Deposit ${deposit.depositNumber} — Principal: ${deposit.principal} + Profit: ${deposit.projectedProfit}`,
          date: now,
        });

        matured++;

        try {
          await createTransactionNotification({
            recipientId: deposit.member,
            title: '🎉 Term Deposit Matured',
            message: `Your term deposit ${deposit.depositNumber} has matured. Rs. ${totalReturn.toLocaleString()} (principal Rs. ${deposit.principal.toLocaleString()} + profit Rs. ${deposit.projectedProfit.toLocaleString()}) has been credited to your ${deposit.sourceAccount} account.`,
            type: 'success',
            branchId: deposit.branchId,
            action: 'term_deposit_matured',
          });
        } catch (notifErr) {
          console.error('[CRON] TD maturity notification error:', notifErr.message);
        }
      } catch (depErr) {
        console.error(
          `[CRON] Error auto-maturing deposit ${deposit._id}:`,
          depErr.message,
        );
      }
    }

    console.log(
      `[CRON] runTermDepositAutoMaturity: matured ${matured} deposit(s).`,
    );
  } catch (err) {
    console.error('[CRON] runTermDepositAutoMaturity ERROR:', err);
  }
};

// ─── Job 11: Member Balance Reconciliation ───────────────────────────────────
/**
 * Runs daily at 05:00 (after TD maturity, before scheduled payments).
 * Rebuilds currentBalance + totalInvested/totalWithdrawn/totalProfit for every
 * member from the ledger (Investment + ProfitDistribution) — the authoritative
 * source. Cached aggregates can drift if any future write path is asymmetric
 * (see commit history); this job sweeps drift before it accumulates.
 *
 * Implementation:
 *   - Two aggregation queries roll up the ledger per-member in one shot.
 *   - We cursor through Members and queue bulkWrite ops in 500-row batches.
 *   - 10k members ⇒ ~2 aggs + 1 cursor + ~20 bulk writes ≈ seconds, not minutes.
 */
const runMemberBalanceReconcile = async () => {
  console.log('[CRON] runMemberBalanceReconcile: starting...');

  try {
    const Member = require('../models/Member');
    const Investment = require('../models/Investment');
    const ProfitDistribution = require('../models/ProfitDistribution');

    // Roll up Investment ledger per member (current account only, exclude
    // Reversed). $cond keeps deposit/withdrawal sums separate so we preserve
    // the same numbers the Member doc tracks.
    const invAgg = await Investment.aggregate([
      {
        $match: {
          accountType: 'current',
          status: { $ne: 'Reversed' },
        },
      },
      {
        $group: {
          _id: '$member',
          totalInvested: {
            $sum: {
              $cond: [
                { $in: ['$type', ['deposit', 'transfer_receive']] },
                '$amount',
                0,
              ],
            },
          },
          totalWithdrawn: {
            $sum: {
              $cond: [
                { $in: ['$type', ['withdrawal', 'transfer_send']] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Only 'regular' profit lands in currentBalance. 'share' lives in
    // shareBalance, 'saving' in savingBalance, and 'term_deposit' is baked
    // into the matching Investment(deposit) at maturity.
    const profitAgg = await ProfitDistribution.aggregate([
      {
        $match: {
          type: 'regular',
          status: { $ne: 'Failed' },
        },
      },
      {
        $group: {
          _id: '$member',
          totalProfit: { $sum: '$amount' },
        },
      },
    ]);

    // Build a fast lookup table keyed by memberId string.
    const ledger = new Map();
    for (const row of invAgg) {
      ledger.set(row._id.toString(), {
        totalInvested: row.totalInvested,
        totalWithdrawn: row.totalWithdrawn,
        totalProfit: 0,
      });
    }
    for (const row of profitAgg) {
      const key = row._id.toString();
      const entry = ledger.get(key) || {
        totalInvested: 0,
        totalWithdrawn: 0,
        totalProfit: 0,
      };
      entry.totalProfit = row.totalProfit;
      ledger.set(key, entry);
    }

    const BATCH = 500;
    let scanned = 0;
    let fixed = 0;
    let ops = [];

    const cursor = Member.find({})
      .select('_id currentBalance totalInvested totalWithdrawn totalProfit')
      .cursor();

    for await (const member of cursor) {
      scanned++;

      const entry = ledger.get(member._id.toString()) || {
        totalInvested: 0,
        totalWithdrawn: 0,
        totalProfit: 0,
      };
      const expectedBalance =
        entry.totalInvested - entry.totalWithdrawn + entry.totalProfit;

      const drift =
        Math.abs(expectedBalance - (member.currentBalance || 0)) > 1 ||
        Math.abs(entry.totalInvested - (member.totalInvested || 0)) > 1 ||
        Math.abs(entry.totalWithdrawn - (member.totalWithdrawn || 0)) > 1 ||
        Math.abs(entry.totalProfit - (member.totalProfit || 0)) > 1;

      if (!drift) continue;

      ops.push({
        updateOne: {
          filter: { _id: member._id },
          update: {
            $set: {
              currentBalance: Math.round(expectedBalance),
              totalInvested: Math.round(entry.totalInvested),
              totalWithdrawn: Math.round(entry.totalWithdrawn),
              totalProfit: Math.round(entry.totalProfit),
            },
          },
        },
      });
      fixed++;

      if (ops.length >= BATCH) {
        await Member.bulkWrite(ops, { ordered: false });
        ops = [];
      }
    }

    if (ops.length) {
      await Member.bulkWrite(ops, { ordered: false });
    }

    console.log(
      `[CRON] runMemberBalanceReconcile: scanned ${scanned}, fixed ${fixed} member(s).`,
    );
  } catch (err) {
    console.error('[CRON] runMemberBalanceReconcile ERROR:', err);
  }
};

// ─── Document Expiry Scan ────────────────────────────────────────────────────
// Daily sweep over Customer and Member document arrays. Two responsibilities:
//   1. Auto-flip status to "Expired" when expiryDate < now (so the UI shows
//      stale CNICs/POAs without the admin having to remember).
//   2. Surface 30-day and 7-day reminders to the member as in-app
//      notifications. Each reminder is stamped on the doc so we never
//      re-fire the same reminder on subsequent runs.
const runDocumentExpiryScan = async () => {
  try {
    const Member = require('../models/Member');
    const Customer = require('../models/Customer');
    const {
      createTransactionNotification,
    } = require('../utils/notificationHelper');

    const now = new Date();
    const ms30d = 30 * 24 * 3600 * 1000;
    const ms7d = 7 * 24 * 3600 * 1000;

    let expiredFlipped = 0;
    let reminders30d = 0;
    let reminders7d = 0;

    // Pull only docs that *could* need action — those with an expiryDate
    // and a non-Rejected status. Rejected docs are dead anyway.
    const memberCursor = Member.find({
      'documents.expiryDate': { $exists: true, $ne: null },
      'documents.status': { $in: ['Pending', 'Verified'] },
    }).cursor();

    for await (const member of memberCursor) {
      let dirty = false;
      for (const doc of member.documents) {
        if (!doc.expiryDate || doc.status === 'Rejected') continue;
        const exp = new Date(doc.expiryDate);
        const diff = exp.getTime() - now.getTime();

        // (1) Auto-flip past-due to Expired
        if (diff <= 0 && doc.status !== 'Expired') {
          doc.status = 'Expired';
          dirty = true;
          expiredFlipped++;
          // Mirror onto the linked Customer doc if any
          if (member.customer) {
            await Customer.updateOne(
              { _id: member.customer, 'documents._id': doc._id },
              { $set: { 'documents.$.status': 'Expired' } },
            );
          }
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: `${doc.type} expired`,
              message: `Your ${doc.type} on file has expired. Please upload a replacement to remain verified.`,
              type: 'warning',
              branchId: member.branchId,
              action: 'document_expired',
              metadata: { docId: doc._id, type: doc.type },
            });
          } catch (_) {
            // Don't let notification failures break the sweep.
          }
          continue;
        }

        // (2) 30-day reminder (fired once)
        if (
          diff > 0 &&
          diff <= ms30d &&
          diff > ms7d &&
          !doc.expiryReminder30dSentAt
        ) {
          doc.expiryReminder30dSentAt = now;
          dirty = true;
          reminders30d++;
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: `${doc.type} expires in 30 days`,
              message: `Your ${doc.type} expires on ${exp.toLocaleDateString()}. Upload a fresh copy before then.`,
              type: 'info',
              branchId: member.branchId,
              action: 'document_expiry_reminder',
              metadata: { docId: doc._id, type: doc.type, daysOut: 30 },
            });
          } catch (_) {
            /* swallow */
          }
        }

        // (3) 7-day reminder (fired once)
        if (diff > 0 && diff <= ms7d && !doc.expiryReminder7dSentAt) {
          doc.expiryReminder7dSentAt = now;
          dirty = true;
          reminders7d++;
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: `${doc.type} expires this week`,
              message: `Your ${doc.type} expires on ${exp.toLocaleDateString()}. Please replace it as soon as possible.`,
              type: 'warning',
              branchId: member.branchId,
              action: 'document_expiry_reminder',
              metadata: { docId: doc._id, type: doc.type, daysOut: 7 },
            });
          } catch (_) {
            /* swallow */
          }
        }
      }
      if (dirty) await member.save();
    }

    // Customers without a Member link still need their docs flipped to
    // Expired (so they show in the verification queue correctly). We don't
    // fire member-side reminders for them.
    const custResult = await Customer.updateMany(
      {
        'documents.expiryDate': { $lt: now },
        'documents.status': { $in: ['Pending', 'Verified'] },
      },
      { $set: { 'documents.$[doc].status': 'Expired' } },
      {
        arrayFilters: [
          {
            'doc.expiryDate': { $lt: now },
            'doc.status': { $in: ['Pending', 'Verified'] },
          },
        ],
      },
    );

    console.log(
      `[CRON] runDocumentExpiryScan: ${expiredFlipped} member docs expired, ${reminders30d}/30d + ${reminders7d}/7d reminders fired, ${custResult.modifiedCount || 0} customer docs flipped.`,
    );
  } catch (err) {
    console.error('[CRON] runDocumentExpiryScan ERROR:', err);
  }
};

// ─── Initializer ─────────────────────────────────────────────────────────────

const initScheduledTasks = () => {
  // Job 1: Mark overdue loans daily at 00:05
  cron.schedule('5 0 * * *', runOverdueDowngrade, { timezone: 'Asia/Karachi' });

  // Job 2: Apply late fees daily at 01:00 (only after tenure expiry)
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

  // Job 7: Loan default detection daily at 01:30
  cron.schedule('30 1 * * *', runLoanDefaultDetection, {
    timezone: 'Asia/Karachi',
  });

  // Job 8: Compound interest accrual daily at 00:30
  cron.schedule('30 0 * * *', runCompoundInterestAccrual, {
    timezone: 'Asia/Karachi',
  });

  // Job 9: Recurring scheduled payments daily at 06:00
  cron.schedule('0 6 * * *', runScheduledPayments, {
    timezone: 'Asia/Karachi',
  });

  // Job 10: Auto-mature term deposits daily at 04:00
  cron.schedule('0 4 * * *', runTermDepositAutoMaturity, {
    timezone: 'Asia/Karachi',
  });

  // Job 11: Member balance reconciliation daily at 05:00.
  // Runs AFTER TD maturity (04:00) and BEFORE scheduled payments (06:00) so
  // the rebuild reflects the night's accruals and isn't races against debits.
  cron.schedule('0 5 * * *', runMemberBalanceReconcile, {
    timezone: 'Asia/Karachi',
  });

  // Job 12: Goal auto-contribute (recurring) daily at 06:15. Runs after the
  // scheduled-payments job (06:00) so the source balance reflects any other
  // morning debits. The service itself enforces day-of-month + once-per-month
  // semantics; running daily is just a polling cadence.
  cron.schedule(
    '15 6 * * *',
    async () => {
      try {
        const {
          runMonthlyAutoContributions,
        } = require('./goalAutoContribute');
        const summary = await runMonthlyAutoContributions();
        if (summary.total > 0) {
          console.log(
            `[CRON] runMonthlyAutoContributions: ${summary.success} ok, ${summary.skipped} skipped, ${summary.failed} failed of ${summary.total} due.`,
          );
        }
      } catch (err) {
        console.error('[CRON] runMonthlyAutoContributions ERROR:', err);
      }
    },
    { timezone: 'Asia/Karachi' },
  );

  // Job 13: Document expiry scan + reminder fire at 07:00. Runs after the
  // morning reconcile/payment jobs so notifications don't compete for
  // member attention with payment alerts.
  cron.schedule('0 7 * * *', runDocumentExpiryScan, {
    timezone: 'Asia/Karachi',
  });

  console.log('[CRON] Scheduled Tasks Engine initialized. 13 jobs registered.');
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
  runLoanDefaultDetection,
  runCompoundInterestAccrual,
  runScheduledPayments,
  runTermDepositAutoMaturity,
  runMemberBalanceReconcile,
  runDocumentExpiryScan,
};

