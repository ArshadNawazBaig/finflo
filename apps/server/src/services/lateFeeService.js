const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const { logActivity } = require('../controllers/activityLogController');
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

        // Check if late fee was already applied this month (prevent double-charging)
        if (loan.lateFeeAppliedAt) {
          const lastApplied = new Date(loan.lateFeeAppliedAt);
          const sameMonth =
            lastApplied.getFullYear() === now.getFullYear() &&
            lastApplied.getMonth() === now.getMonth();
          if (sameMonth) {
            continue; // Already applied this month
          }
        }

        // Calculate fee amount
        let feeAmount;
        if (lateFeeType === 'percentage') {
          feeAmount = Math.round((loan.emi * lateFeeRate) / 100);
        } else {
          feeAmount = lateFeeRate;
        }

        // Apply late fee to the loan
        await Loan.updateOne(
          { _id: loan._id },
          {
            $inc: {
              lateFeeAmount: feeAmount,
              remainingAmount: feeAmount,
              totalAmount: feeAmount,
            },
            $set: {
              lateFeeAppliedAt: now,
              overdueAt: loan.overdueAt || now,
              status: 'overdue',
            },
          },
        );

        // Record financial transaction
        await FinancialTransaction.create({
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
        });

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
            console.error('Late fee notification error:', notifErr);
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
        console.error(`Error applying late fee to loan ${loan._id}:`, err);
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
