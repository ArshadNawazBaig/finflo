const cron = require('node-cron');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Repayment = require('../models/Repayment');
const Notification = require('../models/Notification');
const { generateAmortizationSchedule } = require('../utils/amortizationUtils');
const {
  createTransactionNotification,
} = require('../utils/notificationHelper');

// ─── Constants ──────────────────────────────────────────────────────────────
const GRACE_PERIOD_DAYS = 3;
const LATE_FEE_RATE = 0.02; // 2% of EMI per month, prorated daily
const LATE_FEE_CAP_PCT = 0.2; // never exceed 20% of remaining balance

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
    const activeLoans = await Loan.find({
      status: 'active',
    }).populate('customer');

    let downgraded = 0;

    for (const loan of activeLoans) {
      const nextDue = getNextDueDate(loan);
      if (!nextDue) continue;

      const daysLate = daysBetween(nextDue, today);
      if (daysLate <= GRACE_PERIOD_DAYS) continue;

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
            message: `Your loan #${loan._id.toString().slice(-6).toUpperCase()} is now overdue by ${daysLate - GRACE_PERIOD_DAYS} day(s). Please make a payment as soon as possible to avoid additional late fees.`,
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
      `[CRON] runOverdueDowngrade: ${downgraded} loan(s) marked overdue.`,
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
    const overdueLoans = await Loan.find({
      status: { $in: ['active', 'overdue'] },
    });

    let processed = 0;

    for (const loan of overdueLoans) {
      const nextDue = getNextDueDate(loan);
      if (!nextDue) continue;

      const daysLate = daysBetween(nextDue, today);
      if (daysLate <= GRACE_PERIOD_DAYS) continue;

      // Already applied a fee today?
      if (loan.lateFeeAppliedAt) {
        const lastApplied = new Date(loan.lateFeeAppliedAt);
        lastApplied.setHours(0, 0, 0, 0);
        if (lastApplied.getTime() === today.getTime()) continue;
      }

      const dailyFee = Math.round((loan.emi * LATE_FEE_RATE) / 30);
      const maxFee = Math.round(loan.remainingAmount * LATE_FEE_CAP_PCT);
      const currentAccrued = loan.lateFeeAmount || 0;

      if (currentAccrued >= maxFee) continue; // Already at cap

      const applicableFee = Math.min(dailyFee, maxFee - currentAccrued);
      if (applicableFee <= 0) continue;

      await Loan.findByIdAndUpdate(loan._id, {
        $inc: { lateFeeAmount: applicableFee },
        lateFeeAppliedAt: new Date(),
      });

      processed++;
    }

    console.log(
      `[CRON] runLateFeeAccrual: late fees applied to ${processed} loan(s).`,
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

        // De-dupe: check automatedReminders on loan
        const reminderKey = `reminder_${daysUntilDue}d_inst${item.installment}`;
        const alreadySent = loan.automatedReminders?.some(
          (r) =>
            r.type === reminderKey && r.installmentNumber === item.installment,
        );
        if (alreadySent) continue;

        const customer = await Customer.findById(loan.customer);
        if (!customer?.isMember || !customer.memberId) continue;

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

        // Mark as sent
        await Loan.findByIdAndUpdate(loan._id, {
          $push: {
            automatedReminders: {
              type: reminderKey,
              installmentNumber: item.installment,
              sentAt: new Date(),
            },
          },
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

  console.log('[CRON] Scheduled Tasks Engine initialized. 4 jobs registered.');
};

module.exports = {
  initScheduledTasks,
  // Export runners for direct testing/invocation
  runOverdueDowngrade,
  runLateFeeAccrual,
  runRepaymentReminders,
  runTrustRatingRecalc,
};
