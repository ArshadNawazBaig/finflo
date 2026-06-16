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
const getLoanSchedule = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Authorization check (same as getLoanById)
    if (
      loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
      !(
        req.user.role === 'staff' &&
        loan.branchId?.toString() === req.user.branchId?.toString()
      )
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const schedule = generateAmortizationSchedule(loan);

    // Overlay actual results from repayment history
    const repayments = await Repayment.find({
      loan: loan._id,
      status: 'Completed',
    }).sort({ date: 1 });

    let totalActualPrincipal = repayments.reduce(
      (sum, rp) => sum + (rp.principalAmount || 0),
      0,
    );
    let totalActualInterest = repayments.reduce(
      (sum, rp) => sum + (rp.interestAmount || 0),
      0,
    );

    // Legacy data handling: if we have paidAmount but no breakdown, estimate it using the loan ratio
    const totalAccounted = totalActualPrincipal + totalActualInterest;
    if (totalAccounted < loan.paidAmount - 1) {
      const missingTotal = Math.max(0, loan.paidAmount - totalAccounted);
      const principalRatio = loan.principal / (loan.totalAmount || 1);
      totalActualPrincipal += missingTotal * principalRatio;
      totalActualInterest += missingTotal * (1 - principalRatio);
    }

    const updatedSchedule = schedule.map((item, index) => {
      const isLast = index === schedule.length - 1;
      let paidP = Math.min(item.principal, totalActualPrincipal);
      if (isLast && totalActualPrincipal > 0) paidP = totalActualPrincipal;

      let paidI = 0;
      if (paidP > 0 || (isLast && totalActualInterest > 0)) {
        paidI = Math.min(item.interest, totalActualInterest);
        if (isLast) paidI = totalActualInterest;
      }

      const installment = {
        ...item,
        actualPrincipal: paidP,
        actualInterest: paidI,
        actualTotal: paidP + paidI,
      };

      // For UI compatibility, overwrite projected values with actuals for paid portions or completed loans
      if (paidP > 0 || paidI > 0 || loan.status === 'completed') {
        installment.principal = paidP;
        installment.interest = paidI;
        installment.amount = paidP + paidI;
      }

      totalActualPrincipal = Math.max(0, totalActualPrincipal - paidP);
      totalActualInterest = Math.max(0, totalActualInterest - paidI);

      return installment;
    });

    res.json(updatedSchedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMemberLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      customer: req.member.customer,
    }).populate('customer', 'name accountNumber email phone profilePicture');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Compute next payment date from amortization schedule
    let nextPaymentDate = null;
    if (loan.status === 'active' && loan.emi > 0) {
      const installmentsPaid = Math.floor((loan.paidAmount || 0) / loan.emi);
      const nextInstallment = installmentsPaid + 1;
      if (nextInstallment <= loan.duration) {
        const dueDate = new Date(loan.startDate);
        dueDate.setMonth(dueDate.getMonth() + nextInstallment);
        nextPaymentDate = dueDate;
      }
    }

    res.json({ ...loan.toObject(), nextPaymentDate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMemberLoanSchedule = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      customer: req.member.customer,
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const schedule = generateAmortizationSchedule(loan);

    // Overlay actual results from repayment history
    const repayments = await Repayment.find({
      loan: loan._id,
      status: 'Completed',
    }).sort({ date: 1 });

    let totalActualPrincipal = repayments.reduce(
      (sum, rp) => sum + (rp.principalAmount || 0),
      0,
    );
    let totalActualInterest = repayments.reduce(
      (sum, rp) => sum + (rp.interestAmount || 0),
      0,
    );

    const updatedSchedule = schedule.map((item, index) => {
      const isLast = index === schedule.length - 1;
      let paidP = Math.min(item.principal, totalActualPrincipal);
      if (isLast && totalActualPrincipal > 0) paidP = totalActualPrincipal;

      let paidI = 0;
      if (paidP > 0 || (isLast && totalActualInterest > 0)) {
        paidI = Math.min(item.interest, totalActualInterest);
        if (isLast) paidI = totalActualInterest;
      }

      const installment = {
        ...item,
      };

      if (paidP > 0 || paidI > 0 || loan.status === 'completed') {
        installment.principal = paidP;
        installment.interest = paidI;
        installment.amount = paidP + paidI;
      }

      totalActualPrincipal = Math.max(0, totalActualPrincipal - paidP);
      totalActualInterest = Math.max(0, totalActualInterest - paidI);

      return installment;
    });

    res.json(updatedSchedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMemberRepayments = async (req, res) => {
  try {
    const { loanId, limit, page = 1 } = req.query;

    const query = {
      customer: req.member.customer,
      status: 'Completed',
    };

    if (loanId) {
      query.loan = loanId;
    }

    const itemsPerPage = parseInt(limit) || 50;
    const skip = (parseInt(page) - 1) * itemsPerPage;

    const repayments = await Repayment.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(itemsPerPage)
      .populate('loan', 'principal remainingAmount emi totalAmount')
      .populate('customer', 'name accountNumber profilePicture');

    const total = await Repayment.countDocuments(query);

    res.json({
      success: true,
      count: repayments.length,
      total,
      totalPages: Math.ceil(total / itemsPerPage),
      currentPage: parseInt(page),
      data: repayments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const memberRepayLoan = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const memberTokenId = req.member._id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid payment amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const loan = await Loan.findById(id).populate('customer').session(session);
    if (!loan) throw new Error('Loan not found');

    if (
      !loan.customer?.memberId ||
      loan.customer.memberId.toString() !== memberTokenId.toString()
    ) {
      throw new Error('Unauthorized: This loan does not belong to you');
    }

    const isSettlementRequest = req.body.isSettlement === true;
    const paymentAmount = Math.round(Number(amount));

    if (loan.status !== 'active' && loan.status !== 'pending') {
      throw new Error('This loan is not active or already completed');
    }

    // Use the central repayment service for all logic
    await loanRepaymentService.processRepayment(
      loan,
      paymentAmount,
      req, // Will use req.member for ownership
      {
        notes: req.body.notes || 'Self-repayment via FinFlo',
        isAutoValue: false,
        allowEarlySettlement: isSettlementRequest,
        session,
        paymentMethod: req.body.paymentMethod || 'online',
      },
    );

    await session.commitTransaction();

    // Fetch refreshed member for response and notifications
    const member = await Member.findById(memberTokenId);

    // ── Notifications (Async) ────────────────────────────────────────────────
    try {
      if (member) {
        await createTransactionNotification({
          recipientId: member._id,
          title: 'Loan Repayment Successful',
          message: `Your payment of Rs. ${paymentAmount.toLocaleString()} has been processed for loan #${loan._id.toString().slice(-6).toUpperCase()}.`,
          type: 'success',
          branchId: loan.branchId,
          action: 'loan_repayment_notification',
          metadata: {
            amount: paymentAmount,
            loanId: loan._id,
            link: '/member/loans',
          },
        });

        if (loan.status === 'completed') {
          await createTransactionNotification({
            recipientId: member._id,
            title: 'Loan Fully Paid',
            message: `Congratulations! Your loan #${loan._id.toString().slice(-6).toUpperCase()} has been fully settled.`,
            type: 'success',
            branchId: loan.branchId,
            action: 'loan_completed_notification',
            metadata: { loanId: loan._id, link: '/member/loans' },
          });
        }

        // Notify Admins
        await notifyAdminsOfMemberAction({
          title: 'Member Loan Repayment',
          message: `${member.name} repaid Rs. ${paymentAmount.toLocaleString()} for loan #${loan._id.toString().slice(-6).toUpperCase()}${loan.status === 'completed' ? ' (Loan Completed)' : ''}.`,
          type: 'success',
          branchId: loan.branchId,
          metadata: {
            memberId: member._id,
            loanId: loan._id,
            amount: paymentAmount,
            link: '/loans',
          },
        });
      }
    } catch (notifError) {
      console.error('Member Repayment Notification Error:', notifError);
    }

    res.json({
      message: 'Repayment successful',
      balance: member?.currentBalance || 0,
      loan,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getLoanSchedule,
  getMemberLoanById,
  getMemberLoanSchedule,
  getMemberRepayments,
  memberRepayLoan,
};
