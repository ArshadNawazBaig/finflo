const mongoose = require('mongoose');
const Loan = require('../../models/Loan');
const Customer = require('../../models/Customer');
const Repayment = require('../../models/Repayment');
const FinancialTransaction = require('../../models/FinancialTransaction');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Member = require('../../models/Member');
const Investment = require('../../models/Investment');
const Branch = require('../../models/Branch');
const LoanProduct = require('../../models/LoanProduct');
const SystemSettings = require('../../models/SystemSettings');
const { canCreateLoan } = require('../../utils/planLimits');
const { calculateRiskScore } = require('../../utils/riskService');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../../utils/notificationHelper');
const { logActivity } = require('../activityLogController');
const { escapeRegExp } = require('../../utils/stringUtils');
const { generateAmortizationSchedule } = require('../../utils/amortizationUtils');
const loanRepaymentService = require('../../services/loanRepaymentService');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const { transactionEmail } = require('../../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../../utils/balanceUtils');
const {
  updateMemberCreditLimit,
  calculateCreditLimit,
} = require('../../services/creditLimitService');
const {
  computeCreditScore,
  refreshCreditScore,
} = require('../../services/creditScoringService');
const { getEmailBranding } = require('../../utils/brandingUtils');
const { roundMoney } = require('../../utils/money');

// Loan interest/term math now lives in utils/loanMath.js so the group-lending
// service computes EMI/totalAmount from the same source of truth as these flows.
const {
  calculateEMI,
  calculateSimpleInterest,
  calculateCompoundInterest,
  computeLoanTerms,
} = require('../../utils/loanMath');
const { applyRenewalSettlement } = require('./helpers');

const approveLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customer');
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const { principal, rate, duration, interestType, startDate } = req.body;

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Loan is not in pending status' });
    }

    // ── Renewal request approval ────────────────────────────────────────────
    // A pending loan carrying `renewedFrom` is a member renewal request, not a
    // fresh loan. Finalize it as a restructure (close the old loan; disburse
    // only top-up cash) instead of the standard full-principal disbursement.
    if (loan.renewedFrom) {
      const oldLoan = await Loan.findById(loan.renewedFrom);
      if (!oldLoan) {
        return res
          .status(400)
          .json({ message: 'Original loan for this renewal no longer exists.' });
      }

      const newDuration = duration ? Number(duration) : loan.duration;
      let newRate = rate !== undefined && rate !== '' ? Number(rate) : loan.rate;
      if (!newRate || newRate === 0) {
        const settings = await SystemSettings.getSettings();
        newRate = settings.defaultInterestRate || 0;
      }
      const newInterestType = interestType || loan.interestType || 'simple';

      // Re-snapshot the outstanding at approval time so a rollover always
      // carries the true current balance (it may have changed since request).
      const oldOutstanding = oldLoan.remainingAmount || 0;
      const newPrincipal =
        loan.renewalType === 'rollover'
          ? Math.round(oldOutstanding)
          : principal
            ? Number(principal)
            : loan.principal;

      if (loan.renewalType === 'topup' && newPrincipal <= oldOutstanding) {
        return res.status(400).json({
          message: `Top-up amount must exceed the outstanding balance (Rs. ${Math.round(oldOutstanding).toLocaleString()}).`,
        });
      }

      const { emi, totalAmount } = computeLoanTerms(
        newPrincipal,
        newRate,
        newDuration,
        newInterestType,
      );

      loan.principal = newPrincipal;
      loan.rate = newRate;
      loan.duration = newDuration;
      loan.interestType = newInterestType;
      loan.emi = emi;
      loan.totalAmount = totalAmount;
      loan.paidAmount = 0;
      loan.remainingAmount = totalAmount;
      loan.status = 'active';
      loan.grantor1Status = loan.grantor1 ? 'approved' : loan.grantor1Status;
      loan.grantor2Status = loan.grantor2 ? 'approved' : loan.grantor2Status;
      loan.approvedBy = req.user._id;
      loan.approvedAt = new Date();
      loan.startDate = startDate ? new Date(startDate) : new Date();
      await loan.save();

      await applyRenewalSettlement({
        oldLoan,
        newLoan: loan,
        renewalType: loan.renewalType,
        req,
      });

      // Notify member
      try {
        const customerDoc = await Customer.findById(loan.customer);
        if (customerDoc?.isMember && customerDoc?.memberId) {
          await createTransactionNotification({
            recipientId: customerDoc.memberId,
            title: 'Loan Renewal Approved',
            message: `Your loan renewal (${loan.renewalType}) has been approved. New loan amount: Rs. ${loan.principal.toLocaleString()}.`,
            type: 'success',
            branchId: loan.branchId,
            action: 'loan_approved',
            metadata: { link: '/member/loans', loanId: loan._id },
          });
        }
      } catch (notifError) {
        console.error('Renewal approval notification error:', notifError);
      }

      return res.json(loan);
    }

    // Apply term overrides if provided or if current terms are missing/zero
    if (principal || rate || duration || interestType || loan.rate === 0) {
      const newPrincipal = principal ? Number(principal) : loan.principal;
      let newRate = rate !== undefined ? Number(rate) : loan.rate;
      const newDuration = duration ? Number(duration) : loan.duration;
      const newInterestType = interestType || loan.interestType || 'simple';

      // Robust rate fallback
      if (!newRate || newRate === 0) {
        const settings = await SystemSettings.getSettings();
        newRate = settings.defaultInterestRate || 0;
      }

      let emi, totalAmount;
      if (newInterestType === 'simple' || newInterestType === 'compound') {
        const calcFn = newInterestType === 'compound' ? calculateCompoundInterest : calculateSimpleInterest;
        const result = calcFn(
          newPrincipal,
          newRate,
          newDuration,
        );
        emi = Math.round(result.emi);
        totalAmount = Math.round(result.totalAmount);
      } else {
        emi = Math.round(calculateEMI(newPrincipal, newRate, newDuration));
        totalAmount = emi * newDuration;
      }

      loan.principal = newPrincipal;
      loan.rate = newRate;
      loan.duration = newDuration;
      loan.interestType = newInterestType;
      loan.emi = emi;
      loan.totalAmount = totalAmount;
      loan.remainingAmount = Math.round(totalAmount - loan.paidAmount);
      if (loan.remainingAmount <= 0) {
        loan.status = 'completed';
        // Log activity for auto-completion
        await logActivity({
          userId: req.user?._id || loan.user,
          action: 'loan_status_completed',
          category: 'loan',
          details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} automatically marked as completed via approval`,
          metadata: { loanId: loan._id },
          req,
        });
      }
    }

    if (loan.status !== 'completed') {
      loan.status = 'active';
    }
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    loan.startDate = startDate ? new Date(startDate) : new Date();

    await loan.save();

    // Create Financial Transaction for disbursement
    const financialTx = new FinancialTransaction({
      user: req.user.effectiveOwnerId,
      branchId:
        loan.branchId || (await Customer.findById(loan.customer))?.branchId,
      type: 'loan',
      category: 'loan_disbursement',
      amount: loan.principal,
      date: new Date(),
      description: `Loan disbursement for ${loan.customer.name}`,
      customer: loan.customer._id || loan.customer,
      member: loan.customer?.memberId || null,
      loan: loan._id,
      referenceId: loan._id,
      referenceModel: 'Loan',
      paymentMethod: 'online',
    });
    await financialTx.save();

    // Credit loan principal to member's current account
    const customerDoc = typeof loan.customer === 'object' ? loan.customer : await Customer.findById(loan.customer);
    if (customerDoc?.isMember && customerDoc?.memberId) {
      const updatedMember = await Member.findByIdAndUpdate(
        customerDoc.memberId,
        // Loan proceeds credit the wallet but are NOT member capital — track them
        // in totalLoanProceeds, not totalInvested, so the deposit base stays clean.
        { $inc: { currentBalance: loan.principal, totalLoanProceeds: loan.principal } },
        { new: true },
      );

      if (updatedMember) {
        await Investment.create({
          user: req.user.effectiveOwnerId,
          member: customerDoc.memberId,
          branchId: loan.branchId || updatedMember.branchId,
          type: 'loan_disbursement',
          amount: loan.principal,
          balanceAfter: updatedMember.currentBalance,
          loan: loan._id,
          description: `Loan Disbursement — #${loan._id.toString().slice(-6).toUpperCase()}`,
          date: new Date(),
        });
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_approved',
      category: 'loan',
      details: `Approved loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        customerId: loan.customer,
      },
      req,
    });

    // Notify Member if applicable
    try {
      const customerForNotification = await Customer.findById(loan.customer);
      if (
        customerForNotification &&
        customerForNotification.isMember &&
        customerForNotification.memberId
      ) {
        const notification = new Notification({
          recipient: customerForNotification.memberId,
          recipientModel: 'Member',
          title: 'Loan Approved',
          message: `Your loan request for Rs. ${loan.principal.toLocaleString()} has been approved and credited to your current account.`,
          type: 'success',
          link: '/member/loans',
          action: 'loan_approved',
        });
        await notification.save();
      }

      // Email Notification to Member if applicable (non-blocking)
      if (customerForNotification && customerForNotification.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, loan.branchId);

        sendEmailAsync({
          to: customerForNotification.email,
          subject: `Loan Approved - ${branchName}`,
          html: transactionEmail({
            memberName: customerForNotification.name,
            transactionType: 'Loan Approved',
            amount: loan.principal.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            balance: loan.remainingAmount.toLocaleString(),
            reference: loan._id.toString().slice(-8).toUpperCase(),
            branchName: branchName,
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (notifError) {
      console.error(
        'Failed to send loan approval notification/email:',
        notifError,
      );
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const rejectLoan = async (req, res) => {
  const { reason } = req.body;
  try {
    const loan = await Loan.findById(req.params.id);
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Loan is not in pending status' });
    }

    loan.status = 'rejected';
    loan.rejectedBy = req.user._id;
    loan.rejectionReason = reason;

    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_rejected',
      category: 'loan',
      details: `Rejected loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        reason,
      },
      req,
    });

    // Notify Member if applicable
    try {
      const customer = await Customer.findById(loan.customer);
      if (customer && customer.isMember && customer.memberId) {
        const notification = new Notification({
          recipient: customer.memberId,
          recipientModel: 'Member',
          title: 'Loan Rejected',
          message: `Your loan request for ${loan.principal} has been rejected. Reason: ${reason || 'Not specified'}`,
          type: 'error',
          link: '/member/loans',
          action: 'loan_rejected',
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Failed to send rejection notification:', notifError);
    }

    // Email Notification to Member if applicable
    try {
      const customer = await Customer.findById(loan.customer);
      if (customer && customer.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, loan.branchId);

        sendEmailAsync({
          to: customer.email,
          subject: `Loan Application Update - ${branchName}`,
          html: transactionEmail({
            memberName: customer.name,
            transactionType: 'Loan Rejected',
            amount: loan.principal.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            balance: '0',
            reference: loan._id.toString().slice(-8).toUpperCase(),
            branchName: branchName,
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  approveLoan,
  rejectLoan,
};
