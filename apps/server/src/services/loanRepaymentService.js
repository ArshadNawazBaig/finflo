const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const { logActivity } = require('../controllers/activityLogController');

/**
 * Shared service to process a loan repayment.
 * Can be called manually by admin or automatically by deposit flows.
 */
const processRepayment = async (loan, amount, req, options = {}) => {
  const {
    date = new Date(),
    notes = 'Automatic deduction from deposit',
    isAutoValue = true,
  } = options;

  let repaymentAmount = Number(amount);

  // ── Early Repayment Interest Adjustment ──────────────────────────────────
  // If the payment is large enough to settle the loan with pro-rated interest,
  // we waive the remaining interest.
  let isEarlySettlement = false;
  let actualSettlementAmount = loan.totalAmount;

  if (loan.status === 'active' || loan.status === 'pending') {
    const startDate = new Date(loan.startDate);
    const now = new Date(date);

    // Calculate months passed (minimum 1 month interest)
    let monthsPassed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth());
    if (now.getDate() > startDate.getDate()) monthsPassed += 1; // Count partial month
    monthsPassed = Math.max(1, monthsPassed);

    if (loan.interestType === 'simple') {
      const proRatedInterest = Math.round(
        (loan.principal * loan.rate * monthsPassed) / 1200,
      );
      actualSettlementAmount = loan.principal + proRatedInterest;

      // If this payment + previous payments >= settlement amount
      if (loan.paidAmount + repaymentAmount >= actualSettlementAmount) {
        isEarlySettlement = true;
        // Cap the repayment to only what's needed for the pro-rated settlement
        const amountNeededToSettle = Math.max(
          0,
          actualSettlementAmount - loan.paidAmount,
        );
        repaymentAmount = Math.min(repaymentAmount, amountNeededToSettle);
      }
    }
  }

  // Create Repayment record
  const repayment = new Repayment({
    user: req.user?.effectiveOwnerId || loan.user,
    loan: loan._id,
    customer: loan.customer._id || loan.customer,
    branchId: loan.branchId,
    amount: repaymentAmount,
    date,
    notes: isEarlySettlement ? `${notes} (Early Settlement Adjustment)` : notes,
  });

  await repayment.save();

  // Deduct repayment from linked Member's balance (if member exists)
  try {
    const customer = await Customer.findById(loan.customer);
    if (customer?.memberId) {
      const member = await Member.findById(customer.memberId);
      if (member) {
        member.currentBalance -= repaymentAmount;
        member.totalWithdrawn = (member.totalWithdrawn || 0) + repaymentAmount;
        await member.save();

        // Record in Investment ledger
        await Investment.create({
          user: member.user,
          member: member._id,
          branchId: loan.branchId || member.branchId,
          type: 'withdrawal',
          amount: repaymentAmount,
          balanceAfter: member.currentBalance,
          description: `Loan repayment – #${loan._id.toString().slice(-6).toUpperCase()}${isAutoValue ? ' (Auto)' : ''}${isEarlySettlement ? ' (Settlement)' : ''}`,
          date: new Date(date),
        });
      }
    }
  } catch (balanceError) {
    console.error(
      'Failed to update member balance in repayment service:',
      balanceError,
    );
  }

  // Update loan stats
  if (isEarlySettlement) {
    loan.totalAmount = actualSettlementAmount;
    loan.paidAmount = actualSettlementAmount;
    loan.remainingAmount = 0;
    loan.status = 'completed';

    await logActivity({
      userId: req.user?._id || loan.user,
      action: 'loan_early_settlement',
      category: 'loan',
      details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} settled early with adjusted interest. Total Amount cap: ${actualSettlementAmount}`,
      metadata: {
        loanId: loan._id,
        originalTotal: loan.totalAmount, // This is already updated but we log nonetheless
        finalTotal: actualSettlementAmount,
      },
      req,
    });
  } else {
    loan.paidAmount += repaymentAmount;
    loan.remainingAmount = Math.round(
      Math.max(0, loan.totalAmount - loan.paidAmount),
    );

    if (loan.remainingAmount <= 0) {
      loan.status = 'completed';
      // Log activity for auto-completion
      await logActivity({
        userId: req.user?._id || loan.user,
        action: 'loan_status_completed',
        category: 'loan',
        details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} automatically marked as completed`,
        metadata: { loanId: loan._id },
        req,
      });
    }
  }

  await loan.save();

  // Create Financial Transaction
  const financialTx = new FinancialTransaction({
    user: req.user?.effectiveOwnerId || loan.user,
    branchId: req.user?.branchId || loan.branchId,
    type: 'income',
    category: 'repayment',
    amount: repaymentAmount,
    date: new Date(date),
    description: `Loan repayment for ${loan.customer.name || 'Member'}${isEarlySettlement ? ' (Early Settlement)' : ''}`,
    customer: loan.customer._id || loan.customer,
    loan: loan._id,
    referenceId: repayment._id,
    referenceModel: 'Repayment',
  });
  await financialTx.save();

  // Update Customer Trust Rating
  try {
    const customer = await Customer.findById(loan.customer);
    if (customer) {
      const installmentsCovered = Math.floor(repaymentAmount / loan.emi);
      const previouslyPaidInstallments = Math.floor(
        (loan.paidAmount - repaymentAmount) / loan.emi,
      );

      let totalRatingAdjustment = 0;
      const paymentDate = new Date(date);

      for (let i = 0; i < installmentsCovered; i++) {
        const installmentNumber = previouslyPaidInstallments + i + 1;
        const dueDate = new Date(loan.startDate);
        dueDate.setMonth(dueDate.getMonth() + installmentNumber);

        const isOnTime = paymentDate <= dueDate;
        totalRatingAdjustment += isOnTime ? 0.2 : -0.5;
      }

      customer.trustRating = Math.min(
        10,
        Math.max(0, (customer.trustRating || 5) + totalRatingAdjustment),
      );
      await customer.save();
    }
  } catch (ratingError) {
    console.error('Error updating trust rating in service:', ratingError);
  }

  // Log activity
  await logActivity({
    userId: req.user?._id || loan.user,
    action: 'loan_repayment_added',
    category: 'loan',
    details: `Added ${isAutoValue ? 'auto-' : ''}repayment of ${repaymentAmount} for loan #${loan._id.toString().slice(-6).toUpperCase()}`,
    metadata: {
      loanId: loan._id,
      amount: repaymentAmount,
      repaymentId: repayment._id,
      isAuto: isAutoValue,
    },
    req,
  });

  // ── Notifications ──────────────────────────────────────────────────────
  try {
    const {
      createTransactionNotification,
    } = require('../utils/notificationHelper');
    const customer = await Customer.findById(loan.customer);

    if (customer?.memberId) {
      await createTransactionNotification({
        recipientId: customer.memberId,
        title: isAutoValue
          ? 'Automatic Loan Deduction'
          : 'Loan Repayment Received',
        message: `${isAutoValue ? 'An automatic deduction' : 'A repayment'} of Rs. ${repaymentAmount.toLocaleString()} has been applied to your loan #${loan._id.toString().slice(-6).toUpperCase()}.`,
        type: 'success',
        branchId: loan.branchId,
        action: 'loan_repayment_notification',
        metadata: {
          isAuto: isAutoValue,
          link: '/member/loans', // Link to member loans list
        },
      });

      if (loan.status === 'completed') {
        await createTransactionNotification({
          recipientId: customer.memberId,
          title: 'Loan Successfully Paid',
          message: `Congratulations! Your loan #${loan._id.toString().slice(-6).toUpperCase()} has been fully paid off.`,
          type: 'success',
          branchId: loan.branchId,
          action: 'loan_completed_notification',
          metadata: {
            loanId: loan._id,
            link: '/member/loans',
          },
        });
      }
    }
  } catch (notifError) {
    console.error('Repayment Notification Error in Service:', notifError);
  }

  return { repayment, loan };
};

module.exports = {
  processRepayment,
};
