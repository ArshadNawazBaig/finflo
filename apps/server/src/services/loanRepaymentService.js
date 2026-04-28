const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const Branch = require('../models/Branch');
const { logActivity } = require('../controllers/activityLogController');
const { sendEmail, sendEmailAsync } = require('../utils/email');
const { transactionEmail } = require('../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../utils/balanceUtils');

/**
 * Shared service to process a loan repayment.
 * Can be called manually by admin or automatically by deposit flows.
 */
const processRepayment = async (loan, amount, req, options = {}) => {
  const {
    date = new Date(),
    notes = 'Automatic deduction from deposit',
    isAutoValue = true,
    deductFromWallet = true,
    allowEarlySettlement = true,
    session = null,
    paymentMethod = 'cash',
  } = options;

  let repaymentAmount = Number(amount);

  // ── Early Repayment Interest Adjustment ──────────────────────────────────
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

    // Calculate total precise days passed since loan started
    let diffTimeTotal = now.getTime() - startDate.getTime();
    if (diffTimeTotal < 0) diffTimeTotal = 0;
    const totalDaysPassed = Math.floor(diffTimeTotal / (1000 * 60 * 60 * 24));

    if (loan.interestType === 'simple') {
      const monthlyInterest = (loan.principal * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;

      const proRatedInterest = Math.round(dailyInterest * totalDaysPassed);

      actualSettlementAmount = loan.principal + proRatedInterest;
    } else if (loan.interestType === 'compound') {
      // Compound: interest is on the current outstanding balance (remainingAmount)
      const outstandingBalance = loan.remainingAmount + loan.paidAmount - (loan.compoundedAmount || 0);
      const monthlyInterest = (outstandingBalance * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;

      const proRatedInterest = Math.round(dailyInterest * totalDaysPassed);

      actualSettlementAmount = loan.paidAmount + loan.remainingAmount;
      // If settlement is happening, just pay what's currently owed
      if (proRatedInterest > 0) {
        actualSettlementAmount = loan.paidAmount + loan.remainingAmount;
      }
    } else if (loan.interestType === 'emi') {
      // EMI (Reducing Balance) Early Settlement
      const monthlyRate = loan.rate / 12 / 100;

      // Approximate remaining true principal
      const totalPrins = await Repayment.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, totalPrin: { $sum: '$principalAmount' } } },
      ]);
      const prinPaid = totalPrins.length > 0 ? totalPrins[0].totalPrin : 0;
      const currentPrincipal = Math.max(0, loan.principal - prinPaid);

      // Find days since last repayment to calculate only the current unbilled interest
      const lastRepayment = await Repayment.findOne({ loan: loan._id }).sort({
        date: -1,
      });
      const lastDate = lastRepayment
        ? new Date(lastRepayment.date)
        : new Date(loan.startDate);
      let diffTimeCurr = now.getTime() - lastDate.getTime();
      if (diffTimeCurr < 0) diffTimeCurr = 0;
      const currentDaysPassed = Math.floor(
        diffTimeCurr / (1000 * 60 * 60 * 24),
      );

      const dailyInterest = (currentPrincipal * monthlyRate) / 30;
      const currentPeriodInterest = Math.round(
        dailyInterest * currentDaysPassed,
      );

      // Settlement target = Past Paid + What is Owed Exactly Today
      actualSettlementAmount =
        loan.paidAmount + currentPrincipal + currentPeriodInterest;
    }

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

  // 1. Calculate Interest/Principal Split for the Repayment
  let interestAmount = 0;
  let principalAmount = 0;

  if (isEarlySettlement) {
    interestAmount = Math.max(0, actualSettlementAmount - loan.principal);
    principalAmount = Math.min(repaymentAmount, loan.principal);
  } else {
    // Normal repayment split calculation based on EXACT days elapsed
    const lastRepayment = await Repayment.findOne({ loan: loan._id }).sort({
      date: -1,
    });
    const lastDate = lastRepayment
      ? new Date(lastRepayment.date)
      : new Date(loan.startDate);
    const currentDate = new Date(date);

    // Calculate precise days passed
    let diffTime = currentDate.getTime() - lastDate.getTime();
    if (diffTime < 0) diffTime = 0;
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (loan.interestType === 'simple') {
      const monthlyInterest = (loan.principal * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      interestAmount = Math.round(dailyInterest * daysPassed);
    } else if (loan.interestType === 'compound') {
      // Compound: interest calculated on remaining balance (which grows on missed payments)
      const currentOutstanding = loan.remainingAmount;
      const monthlyInterest = (currentOutstanding * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      interestAmount = Math.round(dailyInterest * daysPassed);
    } else {
      // EMI (Reducing Balance)
      const monthlyRate = loan.rate / 12 / 100;

      // Approximate remaining true principal
      const totalPrins = await Repayment.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, totalPrin: { $sum: '$principalAmount' } } },
      ]);
      const prinPaid = totalPrins.length > 0 ? totalPrins[0].totalPrin : 0;
      const currPrin = Math.max(0, loan.principal - prinPaid);

      const dailyInterest = (currPrin * monthlyRate) / 30;
      interestAmount = Math.round(dailyInterest * daysPassed);
    }

    // Safety checks
    interestAmount = Math.min(interestAmount, repaymentAmount);
    principalAmount = Math.max(0, repaymentAmount - interestAmount);

    // Safeguard: Ensure values make sense
    if (principalAmount > loan.remainingAmount) {
      principalAmount = loan.remainingAmount;
      interestAmount = Math.max(0, repaymentAmount - principalAmount);
    }
  }

  // Create Repayment record
  const currentInstallment = Math.floor(loan.paidAmount / (loan.emi || 1)) + 1;
  const repayment = new Repayment({
    user: req.user?.effectiveOwnerId || loan.user,
    loan: loan._id,
    customer: loan.customer._id || loan.customer,
    branchId: loan.branchId,
    amount: repaymentAmount,
    interestAmount,
    principalAmount,
    installmentNumber: currentInstallment,
    date,
    notes: isEarlySettlement ? `${notes} (Early Settlement Adjustment)` : notes,
  });

  await repayment.save({ session });

  // Deduct repayment from linked Member's balance ONLY for auto-deductions or member-initiated payments
  // (e.g. deposit → auto loan deduction, or member portal self-pay). Manual teller payments
  // are direct cash collections and should NOT reduce the member's wallet balance.
  let customer = null;
  try {
    customer = await Customer.findById(loan.customer);
    if (deductFromWallet && customer?.memberId) {
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

        // Record withdrawal in Financial Ledger so it appears in the journal
        const withdrawalTx = new FinancialTransaction({
          user: updatedMember.user,
          branchId: loan.branchId || updatedMember.branchId,
          type: 'expense',
          category: 'withdrawal',
          amount: repaymentAmount,
          date: new Date(date),
          description: `Loan auto-deduction from wallet – #${loan._id.toString().slice(-6).toUpperCase()}${isEarlySettlement ? ' (Settlement)' : ''}`,
          member: updatedMember._id,
          customer: loan.customer._id || loan.customer,
          loan: loan._id,
          paymentMethod,
        });
        await withdrawalTx.save({ session });
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
    member: customer?.memberId || loan.customer?.memberId || null,
    loan: loan._id,
    referenceId: repayment._id,
    referenceModel: 'Repayment',
    paymentMethod,
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

    // ── Email Notification ───────────────────────────────────────────────
    if (customer && customer.email) {
      const User = require('../models/User');
      const Branch = require('../models/Branch');
      const owner = await User.findById(loan.user).select(
        'businessName name businessLogo',
      );
      const branch = await Branch.findById(loan.branchId);
      let branchName = branch?.branding?.companyName || branch?.name;
      const logoUrl = branch?.branding?.logoUrl || owner?.businessLogo;

      if (!branchName) {
        branchName = owner ? owner.businessName || owner.name : 'FinFlo';
      }

      let effectiveBalance;
      if (customer.memberId) {
        effectiveBalance = await calculateEffectiveBalance(customer.memberId);
      } else {
        effectiveBalance = -loan.remainingAmount; // Non-members only hold loan balance
      }

      sendEmailAsync({
        to: customer.email,
        subject: isAutoValue
          ? 'Automatic Loan Payment Confirmation'
          : 'Loan Repayment Confirmation',
        html: transactionEmail({
          memberName: customer.name,
          transactionType: isAutoValue
            ? 'Automatic Installment'
            : 'Loan Repayment',
          amount: repaymentAmount.toLocaleString(),
          date: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          balance: effectiveBalance.toLocaleString(),
          branchName: branchName,
          reference: repayment._id.toString().slice(-8).toUpperCase(),
          logoUrl: logoUrl,
        }),
      });
    }
  } catch (notifError) {
    console.error('Repayment Notification Error in Service:', notifError);
  }

  return { repayment, loan };
};

module.exports = {
  processRepayment,
};
