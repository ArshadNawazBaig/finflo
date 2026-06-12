const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const { logActivity } = require('../controllers/activityLogController');
const { roundMoney } = require('../utils/money');
const logger = require('../utils/logger');
const {
  createTransactionNotification,
} = require('../utils/notificationHelper');

/**
 * Scan all active loans and apply late fees to overdue installments.
 * Called manually from admin panel or via scheduled cron.
 */
const applyLateFees = async (req) => {
  const User = require('../models/User');

  // Determine the business owner - if called from admin panel, use the caller's business
  const callerOwnerId = req?.user?.effectiveOwnerId || req?.user?._id;

  // Get all admin users whose loans need scanning
  // If triggered by a specific admin, only process their loans
  let adminUsers;
  if (callerOwnerId) {
    adminUsers = [await User.findById(callerOwnerId).select(
      'lateFeeEnabled lateFeeType lateFeeRate lateFeeGracePeriodDays'
    )];
  } else {
    adminUsers = await User.find({ role: 'admin', isActive: true }).select(
      'lateFeeEnabled lateFeeType lateFeeRate lateFeeGracePeriodDays'
    );
  }

  let totalProcessed = 0;
  let totalFeesApplied = 0;
  const allResults = [];

  for (const adminUser of adminUsers) {
    if (!adminUser) continue;

    const lateFeeEnabled = adminUser.lateFeeEnabled === true;
    if (!lateFeeEnabled) continue;

    const lateFeeType = adminUser.lateFeeType || 'fixed';
    const lateFeeRate = adminUser.lateFeeRate ?? 0;
    const lateFeeGracePeriodDays = adminUser.lateFeeGracePeriodDays ?? 0;

    // Find active/overdue loans belonging to this business owner
    const loans = await Loan.find({
      user: adminUser._id,
      status: { $in: ['active', 'overdue'] },
    }).populate('customer', 'name email memberId');

    const now = new Date();
    let feesApplied = 0;
    const results = [];

    for (const loan of loans) {
      try {
        // ── Only apply penalties AFTER the full loan tenure has expired ──
        const startDate = new Date(loan.startDate);
        const tenureEndDate = new Date(startDate);
        tenureEndDate.setMonth(tenureEndDate.getMonth() + loan.duration);

        // If we haven't passed the loan tenure end date yet, skip
        if (now <= tenureEndDate) {
          continue;
        }

        // If the loan is fully paid, skip
        if (loan.remainingAmount <= 0) {
          continue;
        }

        // Add grace period after tenure end
        const graceDeadline = new Date(tenureEndDate);
        graceDeadline.setDate(graceDeadline.getDate() + lateFeeGracePeriodDays);

        // Only apply if we're past the grace period after tenure end
        if (now <= graceDeadline) {
          continue;
        }

        // Check if a late fee was already applied this month by EITHER engine
        // (prevent double-charging / stacking with the daily accrual cron).
        if (loan.lateFeeAppliedAt) {
          const lastApplied = new Date(loan.lateFeeAppliedAt);
          const sameMonth =
            lastApplied.getFullYear() === now.getFullYear() &&
            lastApplied.getMonth() === now.getMonth();
          if (sameMonth) {
            continue; // Already charged this month (by manual or accrual)
          }
        }

        // Calculate fee amount
        let feeAmount;
        if (lateFeeType === 'percentage') {
          feeAmount = roundMoney((loan.emi * lateFeeRate) / 100);
        } else {
          feeAmount = lateFeeRate;
        }

        // Accrue the fee onto the loan AND book its ledger row atomically. These
        // are two documents; without a transaction a crash between them leaves a
        // fee on the loan with no income row (or vice versa) — the orphan-row /
        // missing-fee-income drift these very scripts (fixOrphanTransactions,
        // backfillMissingFeeIncome) were written to repair.
        //
        // The Loan.updateOne filter is also the IDEMPOTENCY guard: it only
        // charges when no fee was applied this calendar month, so two concurrent
        // cron runs (or a manual + scheduled overlap) can never stack a fee.
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const session = await mongoose.startSession();
        let applied = false;
        try {
          await session.withTransaction(async () => {
            const upd = await Loan.updateOne(
              {
                _id: loan._id,
                remainingAmount: { $gt: 0 },
                $or: [
                  { lateFeeAppliedAt: null },
                  { lateFeeAppliedAt: { $exists: false } },
                  { lateFeeAppliedAt: { $lt: startOfMonth } },
                ],
              },
              {
                $inc: {
                  lateFeeAmount: feeAmount,
                  remainingAmount: feeAmount,
                  totalAmount: feeAmount,
                },
                $set: {
                  lateFeeAppliedAt: now,
                  lateFeeSource: 'manual',
                  overdueAt: loan.overdueAt || now,
                  status: 'overdue',
                },
              },
              { session },
            );

            // Already charged this month (or charged concurrently) — book nothing.
            if (upd.modifiedCount === 0) return;

            await FinancialTransaction.create(
              [
                {
                  user: loan.user,
                  branchId: loan.branchId,
                  type: 'income',
                  category: 'late_fee',
                  amount: feeAmount,
                  date: now,
                  description: `Late fee for loan #${loan._id.toString().slice(-6).toUpperCase()} — ${loan.customer?.name || 'Unknown'}`,
                  customer: loan.customer._id || loan.customer,
                  loan: loan._id,
                  referenceId: loan._id,
                  referenceModel: 'Loan',
                },
              ],
              { session },
            );
            applied = true;
          });
        } finally {
          await session.endSession();
        }

        // Nothing charged this round (idempotency guard) — skip side effects.
        if (!applied) continue;

        // Note: the fee is accrued onto the loan (remainingAmount/totalAmount above).
        // The member's wallet is NOT debited here — doing so would double-charge:
        // once via the loan growing, once via the wallet shrinking. The fee is
        // settled when the borrower next makes a repayment.
        if (loan.customer?.memberId) {
          // Notify member
          try {
            await createTransactionNotification({
              recipientId: loan.customer.memberId,
              title: 'Late Fee Applied',
              message: `A late fee of Rs. ${feeAmount.toLocaleString()} has been applied to your loan #${loan._id.toString().slice(-6).toUpperCase()} due to overdue payment.`,
              type: 'warning',
              branchId: loan.branchId,
              action: 'late_fee_applied',
              metadata: {
                loanId: loan._id,
                feeAmount,
                link: '/member/loans',
              },
            });
          } catch (notifErr) {
            logger.error({ err: notifErr, loanId: loan._id }, 'Late fee notification error');
          }
        }

        // Log activity
        if (req) {
          await logActivity({
            userId: req.user?._id || loan.user,
            action: 'late_fee_applied',
            category: 'loan',
            details: `Late fee of ${feeAmount} applied to loan #${loan._id.toString().slice(-6).toUpperCase()} for ${loan.customer?.name || 'Unknown'}`,
            metadata: { loanId: loan._id, feeAmount },
            req,
          });
        }

        feesApplied++;
        results.push({
          loanId: loan._id,
          customer: loan.customer?.name,
          feeAmount,
          reason: 'post_tenure',
        });
      } catch (err) {
        logger.error({ err, loanId: loan._id }, 'Error applying late fee to loan');
      }
    }

    totalProcessed += loans.length;
    totalFeesApplied += feesApplied;
    allResults.push(...results);
  } // end of per-business loop

  return {
    processed: totalProcessed,
    feesApplied: totalFeesApplied,
    results: allResults,
    message: `Scanned ${totalProcessed} loans, applied ${totalFeesApplied} late fees`,
  };
};

module.exports = { applyLateFees };
