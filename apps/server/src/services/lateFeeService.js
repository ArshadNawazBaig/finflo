const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const SystemSettings = require('../models/SystemSettings');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const { logActivity } = require('../controllers/activityLogController');
const {
  createTransactionNotification,
} = require('../utils/notificationHelper');

/**
 * Scan all active loans and apply late fees to overdue installments.
 * Called manually from admin panel or via scheduled cron.
 */
const applyLateFees = async (req) => {
  const settings = await SystemSettings.getSettings();

  if (!settings.lateFeeEnabled) {
    return { processed: 0, message: 'Late fees are disabled in settings' };
  }

  const {
    lateFeeType = 'fixed',
    lateFeeRate = 500,
    lateFeeGracePeriodDays = 3,
  } = settings;

  // Find all active/overdue loans
  const loans = await Loan.find({
    status: { $in: ['active', 'overdue'] },
  }).populate('customer', 'name email memberId');

  const now = new Date();
  let feesApplied = 0;
  const results = [];

  for (const loan of loans) {
    try {
      // Calculate how many installments should have been paid by now
      const startDate = new Date(loan.startDate);
      let monthsElapsed =
        now.getFullYear() * 12 +
        now.getMonth() -
        (startDate.getFullYear() * 12 + startDate.getMonth());

      if (now.getDate() < startDate.getDate()) {
        monthsElapsed -= 1;
      }
      monthsElapsed = Math.max(0, monthsElapsed);

      // Expected total paid by now (installments * EMI)
      const expectedInstallments = Math.min(monthsElapsed, loan.duration);
      const expectedPaid = expectedInstallments * loan.emi;

      // Check if the member is behind on payments
      if (loan.paidAmount >= expectedPaid) {
        continue; // On track, no late fee
      }

      // Calculate the due date for the next expected installment
      const missedInstallment = Math.floor(loan.paidAmount / loan.emi) + 1;
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + missedInstallment);

      // Add grace period
      const graceDeadline = new Date(dueDate);
      graceDeadline.setDate(graceDeadline.getDate() + lateFeeGracePeriodDays);

      // Only apply if we're past the grace period
      if (now <= graceDeadline) {
        continue;
      }

      // Check if late fee was already applied for this overdue period (within same month)
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

      // Deduct from member's current account if they are a member
      if (loan.customer?.memberId) {
        const member = await Member.findById(loan.customer.memberId);
        if (member && member.currentBalance >= feeAmount) {
          await Member.updateOne(
            { _id: member._id },
            {
              $inc: {
                currentBalance: -feeAmount,
                totalWithdrawn: feeAmount,
              },
            },
          );

          const updatedMember = await Member.findById(member._id);

          await Investment.create({
            user: member.user,
            member: member._id,
            branchId: loan.branchId || member.branchId,
            type: 'withdrawal',
            amount: feeAmount,
            accountType: 'current',
            description: `Late fee penalty — Loan #${loan._id.toString().slice(-6).toUpperCase()}`,
            balanceAfter: updatedMember.currentBalance,
            date: now,
          });
        }

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
        missedInstallment,
      });
    } catch (err) {
      console.error(`Error applying late fee to loan ${loan._id}:`, err);
    }
  }

  return {
    processed: loans.length,
    feesApplied,
    results,
    message: `Scanned ${loans.length} loans, applied ${feesApplied} late fees`,
  };
};

module.exports = { applyLateFees };
