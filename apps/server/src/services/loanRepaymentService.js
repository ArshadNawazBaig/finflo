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
    allowEarlySettlement = true,
    session = null,
  } = options;

  let repaymentAmount = Number(amount);

  // ── Early Repayment Interest Adjustment ──────────────────────────────────
  // If the payment is large enough to settle the loan with pro-rated interest,
  // we waive the remaining interest.
  let isEarlySettlement = false;
  let actualSettlementAmount = loan.totalAmount;

  if (
    allowEarlySettlement &&
    (loan.status === 'active' ||
      loan.status === 'overdue' ||
      loan.status === 'pending')
  ) {
    const startDate = new Date(loan.startDate);
    const now = new Date(date);

    // Calculate months and days passed
    const diffYears = now.getFullYear() - startDate.getFullYear();
    const diffMonths = now.getMonth() - startDate.getMonth();
    let fullMonths = diffYears * 12 + diffMonths;

    if (now.getDate() < startDate.getDate()) {
      fullMonths -= 1;
    }
    fullMonths = Math.max(0, fullMonths);

    // Calculate extra days into the current partial month
    let daysIntoMonth = 0;
    if (now.getDate() >= startDate.getDate()) {
      daysIntoMonth = now.getDate() - startDate.getDate();
    } else {
      // Find previous anniversary date
      const prevMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        startDate.getDate(),
      );
      const diffTime = Math.abs(now - prevMonth);
      daysIntoMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (loan.interestType === 'simple') {
      const monthlyInterest = (loan.principal * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;

      // Charge for full months + daily pro-rate for partial month
      // Minimum 1 month interest for business protection
      const calculatedInterest =
        monthlyInterest * fullMonths + dailyInterest * daysIntoMonth;
      const proRatedInterest = Math.round(
        Math.max(monthlyInterest, calculatedInterest),
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

  // 1. Calculate Interest/Principal Split for the Repayment
  let interestAmount = 0;
  let principalAmount = 0;

  if (isEarlySettlement) {
    // For early settlement, interest is waived/adjusted
    // Profit is (Final Settled Total - Original Principal)
    interestAmount = Math.max(0, actualSettlementAmount - loan.principal);
    principalAmount = Math.min(repaymentAmount, loan.principal);
  } else {
    // Normal repayment split calculation
    if (loan.interestType === 'simple') {
      const months = loan.duration || 1;
      const totalInterest = loan.totalAmount - loan.principal;
      // Interest per full installment; cap at actual payment to avoid overstating interest on partial payments
      const interestPerInstallment = totalInterest / months;
      interestAmount = Math.round(
        Math.min(interestPerInstallment, repaymentAmount),
      );
      principalAmount = Math.max(0, repaymentAmount - interestAmount);
    } else {
      // EMI (Reducing Balance)
      // Interest portion = (Current Remaining Principal) * (Monthly Interest Rate)
      const monthlyRate = loan.rate / 12 / 100;
      interestAmount = Math.round(loan.remainingAmount * monthlyRate);
      principalAmount = repaymentAmount - interestAmount;
    }

    // Safeguard: Ensure values make sense (at loan end or for overpayments)
    if (principalAmount > loan.remainingAmount) {
      principalAmount = loan.remainingAmount;
      interestAmount = Math.max(0, repaymentAmount - principalAmount);
    }
  }

  // Create Repayment record
  const repayment = new Repayment({
    user: req.user?.effectiveOwnerId || loan.user,
    loan: loan._id,
    customer: loan.customer._id || loan.customer,
    branchId: loan.branchId,
    amount: repaymentAmount,
    interestAmount,
    principalAmount,
    date,
    notes: isEarlySettlement ? `${notes} (Early Settlement Adjustment)` : notes,
  });

  await repayment.save({ session });

  // Deduct repayment from linked Member's balance (if member exists) atomically
  try {
    const customer = await Customer.findById(loan.customer);
    if (customer?.memberId) {
      const updatedMember = await Member.findByIdAndUpdate(
        customer.memberId,
        {
          $inc: {
            currentBalance: -repaymentAmount,
            totalWithdrawn: repaymentAmount,
          },
        },
        { new: true, session },
      );

      if (updatedMember) {
        // Record in Investment ledger
        await Investment.create(
          [
            {
              user: updatedMember.user,
              member: updatedMember._id,
              branchId: loan.branchId || updatedMember.branchId,
              type: 'withdrawal',
              amount: repaymentAmount,
              balanceAfter: updatedMember.currentBalance,
              description: `Loan repayment – #${loan._id.toString().slice(-6).toUpperCase()}${isAutoValue ? ' (Auto)' : ''}${isEarlySettlement ? ' (Settlement)' : ''}`,
              date: new Date(date),
            },
          ],
          { session },
        );
      }
    }
  } catch (balanceError) {
    console.error(
      'Failed to update member balance in repayment service:',
      balanceError,
    );
  }

  // Update loan stats atomically
  if (isEarlySettlement) {
    // For early settlement, we set absolute values as it's a structural change to the loan
    const updatedLoan = await Loan.findByIdAndUpdate(
      loan._id,
      {
        totalAmount: actualSettlementAmount,
        paidAmount: actualSettlementAmount,
        remainingAmount: 0,
        status: 'completed',
      },
      { new: true, session },
    );

    // Sync the passed loan object for the return value and subsequent logic
    Object.assign(loan, updatedLoan.toObject());

    await logActivity({
      userId: req.user?._id || loan.user,
      action: 'loan_early_settlement',
      category: 'loan',
      details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} settled early with adjusted interest. Total Amount cap: ${actualSettlementAmount}`,
      metadata: {
        loanId: loan._id,
        originalTotal: loan.totalAmount,
        finalTotal: actualSettlementAmount,
      },
      req,
    });
  } else {
    // Normal repayment: Atomic increment/decrement
    const updatedLoan = await Loan.findByIdAndUpdate(
      loan._id,
      {
        $inc: {
          paidAmount: repaymentAmount,
          remainingAmount: -repaymentAmount,
        },
        // If the loan was overdue, a payment brings it back to active
        ...(loan.status === 'overdue' ? { status: 'active' } : {}),
      },
      { new: true, session },
    );

    // Safeguard remainingAmount (rounding or floating point issues)
    if (updatedLoan.remainingAmount < 0.01) {
      updatedLoan.remainingAmount = 0;
      updatedLoan.status = 'completed';
      await updatedLoan.save({ session });

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

    // Sync the passed loan object
    Object.assign(loan, updatedLoan.toObject());
  }

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
  await financialTx.save({ session });

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
      const GRACE_PERIOD_DAYS = 3;

      for (let i = 0; i < installmentsCovered; i++) {
        const installmentNumber = previouslyPaidInstallments + i + 1;
        const dueDate = new Date(loan.startDate);
        dueDate.setMonth(dueDate.getMonth() + installmentNumber);

        // Add grace period to due date
        const gracePeriodDueDate = new Date(dueDate);
        gracePeriodDueDate.setDate(
          gracePeriodDueDate.getDate() + GRACE_PERIOD_DAYS,
        );

        const isOnTime = paymentDate <= gracePeriodDueDate;
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
