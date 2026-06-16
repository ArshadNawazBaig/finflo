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
const { capitalizeName } = require('../../utils/stringUtils');

// ─── Fallback Constants (used only if config fails) ─────────────────────────
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const DEFAULT_LATE_FEE_CAP_PCT = 0.2; // never exceed 20% of remaining balance
/**
 * Fetch late fee configuration from a specific admin User with safe fallbacks.
 */
const getLateFeeConfig = async (adminUserId) => {
  try {
    const User = require('../../models/User');
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
    const User = require('../../models/User');
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

        // Joint-liability cascade: if this loan belongs to a group, flag the
        // whole group at-risk and notify co-members (no auto wallet debits).
        if (loan.groupLoan) {
          await require('../groupLoanService').cascadeGroupRisk(loan);
        }

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
    const User = require('../../models/User');
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

        // GATE: if the MANUAL flat-fee engine already charged this loan this
        // calendar month, the daily accrual must not stack on top of it. The
        // manual path is symmetrically gated by its own same-month guard, so the
        // first engine to touch a loan in a month owns it for that month.
        if (loan.lateFeeSource === 'manual' && loan.lateFeeAppliedAt) {
          const applied = new Date(loan.lateFeeAppliedAt);
          if (
            applied.getFullYear() === today.getFullYear() &&
            applied.getMonth() === today.getMonth()
          ) {
            continue;
          }
        }

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
            $set: { lateFeeAppliedAt: new Date(), lateFeeSource: 'accrual' },
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
    const User = require('../../models/User');
    const Member = require('../../models/Member');
    const { logActivity } = require('../../controllers/activityLogController');

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

          // ── Joint-liability cascade: flag the group defaulted/at-risk ──
          if (loan.groupLoan) {
            await require('../groupLoanService').cascadeGroupRisk(loan);
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
              message: `Loan #${loan._id.toString().slice(-6).toUpperCase()} for ${capitalizeName(loan.customer?.name) || 'Unknown'} has been automatically defaulted after ${thresholdMonths} month(s) past tenure. Outstanding: ${loan.remainingAmount}.`,
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
                message: `A loan you guaranteed (#${loan._id.toString().slice(-6).toUpperCase()}) for ${capitalizeName(loan.customer?.name) || 'Unknown'} has been defaulted. Outstanding: ${loan.remainingAmount}.`,
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

            // Refresh the credit-score snapshot so the default reflects in the
            // borrower's score (and their limit) immediately.
            try {
              const { refreshCreditScore } = require('../creditScoringService');
              await refreshCreditScore(loan.customer._id);
            } catch (scoreErr) {
              console.error('[CRON] Credit score refresh error:', scoreErr.message);
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

        // Compound interest exactly ONCE per missed installment-period. The old
        // code added a full month's interest every single day the loan stayed
        // overdue (the daily `lastCompoundedAt < today` guard only blocked a second
        // charge on the SAME day) — so one missed installment compounded ~30× per
        // month and the balance exploded. We now track how many periods have
        // already been capitalized (`compoundedPeriods`) and only charge the
        // not-yet-compounded periods.
        const overduePeriods = monthsSinceStart - installmentsPaid;
        const alreadyCompounded = loan.compoundedPeriods || 0;
        const periodsToCompound = overduePeriods - alreadyCompounded;
        if (periodsToCompound <= 0) continue;

        // Capitalize one month of interest for each missed period, compounding on
        // OUTSTANDING PRINCIPAL only (interest-on-interest across distinct missed
        // months, but never on accrued late fees). Falls back to remainingAmount for
        // legacy loans not yet backfilled with outstandingPrincipal.
        const hasOutstanding = typeof loan.outstandingPrincipal === 'number';
        let runningBalance = hasOutstanding
          ? loan.outstandingPrincipal
          : loan.remainingAmount;
        let interestToAdd = 0;
        for (let p = 0; p < periodsToCompound; p++) {
          const periodInterest = Math.round((runningBalance * loan.rate) / 1200);
          if (periodInterest <= 0) break;
          interestToAdd += periodInterest;
          runningBalance += periodInterest;
        }

        if (interestToAdd <= 0) continue;

        const monthlyInterest = interestToAdd; // for the notification below

        // CAS on compoundedPeriods makes this idempotent across duplicate/concurrent
        // cron runs: only the run that observes the expected prior count wins.
        // Loans created before this field existed have NO `compoundedPeriods` key;
        // a plain `{ compoundedPeriods: 0 }` predicate would NOT match a missing
        // field, so legacy overdue loans must also match absent/null.
        const periodCas =
          alreadyCompounded === 0
            ? {
                $or: [
                  { compoundedPeriods: 0 },
                  { compoundedPeriods: { $exists: false } },
                  { compoundedPeriods: null },
                ],
              }
            : { compoundedPeriods: alreadyCompounded };
        const updatedLoan = await Loan.findOneAndUpdate(
          {
            _id: loan._id,
            ...periodCas,
          },
          {
            $inc: {
              totalAmount: interestToAdd,
              remainingAmount: interestToAdd,
              compoundedAmount: interestToAdd,
              compoundedPeriods: periodsToCompound,
              // Capitalize the interest into principal so the next period compounds
              // on it — but only for loans that actually track the field, so we
              // never seed a wrong value on an un-backfilled legacy loan.
              ...(hasOutstanding ? { outstandingPrincipal: interestToAdd } : {}),
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

module.exports = {
  runOverdueDowngrade,
  runLateFeeAccrual,
  runRepaymentReminders,
  runLoanDefaultDetection,
  runCompoundInterestAccrual,
};
