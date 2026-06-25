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
const getLoans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    let query = req.user.isSuperAdmin
      ? {}
      : { user: req.user.effectiveOwnerId };

    // Branch Segregation: Staff/Managers only see their branch data
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    if (req.query.customerId) {
      query.customer = req.query.customerId;
    }

    if (search) {
      const safeSearch = escapeRegExp(String(search));
      // Find customers matching search name
      const matchingCustomers = await Customer.find({
        user: req.user.effectiveOwnerId,
        $or: [
          { name: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
          { phone: { $regex: safeSearch, $options: 'i' } },
          { cnic: { $regex: safeSearch, $options: 'i' } },
          { savingAccountNumber: { $regex: safeSearch, $options: 'i' } },
          { currentAccountNumber: { $regex: safeSearch, $options: 'i' } },
          { loanAccountNumber: { $regex: safeSearch, $options: 'i' } },
        ],
      }).select('_id');
      const customerIds = matchingCustomers.map((c) => c._id);

      // If customerId filter is already present, intersect the results
      // Otherwise just use the search results
      if (query.customer) {
        // If searching with ID, ensure the ID is in the search results
        // This handles edge case where user searches + filters by ID
        const searchIdsStr = customerIds.map((id) => id.toString());
        if (!searchIdsStr.includes(query.customer)) {
          // Invalidate query if ID doesn't match search
          query.customer = null;
        }
      } else {
        query.customer = { $in: customerIds };
      }
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const totalEntries = await Loan.countDocuments(query);
    const loans = await Loan.find(query)
      .populate('customer', 'name email isMember memberId profilePicture')
      .populate('grantor1', 'name profilePicture')
      .populate('grantor2', 'name profilePicture')
      .populate('product', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    res.json({
      data: loans,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyLoans = async (req, res) => {
  try {
    if (!req.member.customer) {
      return res.json({ data: [], totalEntries: 0 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      customer: req.member.customer,
    };

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.search) {
      const search = req.query.search;
      const isNumber = !isNaN(search);

      query.$or = [
        { _id: mongoose.isValidObjectId(search) ? search : undefined },
        { principal: isNumber ? parseFloat(search) : undefined },
        { totalAmount: isNumber ? parseFloat(search) : undefined },
      ].filter((cond) => {
        const value = Object.values(cond)[0];
        return value !== undefined;
      });

      // If no valid mongo ID but looks like a partial hex string, we can't easily search _id with regex
      // without converting it to a string, which is slow. But we can at least try to match what's possible.
      if (query.$or.length === 0) delete query.$or;
    }

    const totalEntries = await Loan.countDocuments(query);
    const loans = await Loan.find(query)
      .populate('grantor1', 'name')
      .populate('grantor2', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: loans,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('customer', 'name email phone trustRating profilePicture')
      .populate('grantor1', 'name')
      .populate('grantor2', 'name')
      .populate('product', 'name');
    if (
      loan &&
      (loan.user.toString() === req.user.effectiveOwnerId.toString() ||
        (req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()) ||
        req.user.role === 'super_admin')
    ) {
      res.json(loan);
    } else {
      res.status(404).json({ message: 'Loan not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addRepayment = async (req, res) => {
  const { loanId, amount, date, notes, isSettlement, paymentMethod = 'cash', deductFromWallet = false } = req.body;
  // Wrap the full repayment in a Mongo transaction so the Repayment, Loan
  // ($inc paidAmount/remainingAmount), Member wallet debit and
  // FinancialTransaction either ALL commit or all roll back. Without this,
  // a mid-flow error left the member debited but the loan unupdated.
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const loan = await Loan.findById(loanId).populate('customer').session(session);
    if (
      !loan ||
      (loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          loan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Loan is already completed' });
    }

    const { repayment } = await loanRepaymentService.processRepayment(
      loan,
      amount,
      req,
      {
        date,
        isAutoValue: false,
        deductFromWallet,
        notes: notes || '',
        allowEarlySettlement: true,
        paymentMethod,
        session,
      },
    );

    await session.commitTransaction();

    // Post-commit best-effort housekeeping (credit-limit update) — failure
    // here should not poison the successful repayment.
    if (loan.status === 'completed' && loan.customer.memberId) {
      try {
        await updateMemberCreditLimit(loan.customer.memberId);
      } catch (limitError) {
        console.error(
          'Failed to update credit limit on loan completion:',
          limitError,
        );
      }
    }

    res.status(201).json(repayment);
  } catch (error) {
    try { await session.abortTransaction(); } catch (_) { /* ignore */ }
    console.error('Add Repayment Error:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to add repayment' });
  } finally {
    session.endSession();
  }
};

const getRepayments = async (req, res) => {
  // Optionally filter by loanId or customerId
  const { loanId, customerId } = req.query;
  const query = req.user.isSuperAdmin
    ? {}
    : { user: req.user.effectiveOwnerId };

  // Branch Segregation
  if (req.user.role === 'staff') {
    const branchScope = req.user.managedBranchId || req.user.branchId;
    if (branchScope) query.branchId = branchScope;
  }

  // Exclude reversed repayments from standard views
  query.status = { $ne: 'Reversed' };

  if (loanId) query.loan = loanId;
  if (customerId) query.customer = customerId;

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    if (search) {
      const matchingCustomers = await Customer.find({
        user: req.user.effectiveOwnerId,
        name: { $regex: escapeRegExp(String(search)), $options: 'i' },
      }).select('_id');
      const customerIds = matchingCustomers.map((c) => c._id);
      query.customer = { $in: customerIds };
    }

    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const totalEntries = await Repayment.countDocuments(query);
    const repayments = await Repayment.find(query)
      .populate('loan', 'principal totalAmount')
      .populate('customer', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    res.json({
      data: repayments,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLoan = async (req, res) => {
  const { principal, rate, duration, status, interestType } = req.body;
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

    // Update status if provided and valid
    if (status) {
      const allowedStatuses = ['active', 'completed', 'defaulted'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      loan.status = status;

      // If setting to active, ensure Start Date is set to now (if desired)
      if (status === 'active' && loan.status !== 'active') {
        loan.startDate = new Date();
      }
    }

    // SECURITY: financial terms (principal / rate / duration / interestType)
    // are LOCKED once a loan leaves the `pending` state. Editing terms on an
    // active or completed loan would let an admin retroactively zero-out the
    // remaining amount or alter what the borrower owes. If terms genuinely
    // need to change, the workflow is to issue a new loan / write-off.
    const termsLocked = !['pending', 'rejected'].includes(loan.status);
    if (termsLocked && (principal || rate || duration || interestType)) {
      return res.status(400).json({
        message:
          'Loan terms (principal, rate, duration, interest type) cannot be edited once the loan is active. Issue a new loan or use the write-off flow instead.',
      });
    }

    // Recalculate EMI and total if principal, rate, duration or interestType changed
    if (principal || rate || duration || interestType) {
      const newPrincipal = principal ? Number(principal) : loan.principal;
      const newRate = rate ? Number(rate) : loan.rate;
      const newDuration = duration ? Number(duration) : loan.duration;
      const newInterestType = interestType || loan.interestType || 'simple';

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
          details: `Loan #${loan._id.toString().slice(-6).toUpperCase()} automatically marked as completed via update`,
          metadata: { loanId: loan._id },
          req,
        });
      }
    }

    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_updated',
      category: 'loan',
      details: `Updated loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        changes: {
          principal: principal
            ? { old: loan.principal, new: Number(principal) }
            : undefined,
          rate: rate ? { old: loan.rate, new: Number(rate) } : undefined,
          duration: duration
            ? { old: loan.duration, new: Number(duration) }
            : undefined,
          status: status ? { old: loan.status, new: status } : undefined,
          interestType: interestType
            ? { old: loan.interestType, new: interestType }
            : undefined,
        },
      },
      req,
    });

    // Notify Member if status changed
    if (status && (status === 'active' || status === 'rejected')) {
      try {
        const customer = await Customer.findById(loan.customer);
        if (customer && customer.isMember && customer.memberId) {
          const notificationTitle =
            status === 'active' ? 'Loan Approved' : 'Loan Rejected';
          const notificationMessage =
            status === 'active'
              ? `Your loan request for ${loan.principal} has been approved.`
              : `Your loan request for ${loan.principal} has been rejected.`;
          const notificationType = status === 'active' ? 'success' : 'error';

          const notification = new Notification({
            recipient: customer.memberId,
            recipientModel: 'Member',
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: '/member/loans',
            action: status === 'active' ? 'loan_approved' : 'loan_rejected',
          });
          await notification.save();
        }

        // Email Notification to Customer/Member (non-blocking)
        if (customer && customer.email) {
          const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, loan.branchId);

          sendEmailAsync({
            to: customer.email,
            subject: `${notificationTitle} - ${branchName}`,
            html: transactionEmail({
              memberName: customer.name,
              transactionType: notificationTitle,
              amount: loan.principal.toLocaleString(),
              date: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
              balance: (
                await calculateEffectiveBalance(customer.memberId)
              ).toLocaleString(),
              reference: loan._id.toString().slice(-8).toUpperCase(),
              branchName: branchName,
              logoUrl: logoUrl,
            }),
          });
        }
      } catch (notifError) {
        console.error('Failed to send member notification:', notifError);
      }
    }

    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getUpcomingRepayments = async (req, res) => {
  try {
    const { loanId } = req.query;
    const query = {
      user: req.user.effectiveOwnerId,
      status: 'active',
    };

    // Branch Segregation
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    if (loanId) {
      query._id = loanId;
    }

    const loans = await Loan.find(query).populate(
      'customer',
      'name email phone',
    );

    const upcoming = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const loan of loans) {
      // Calculate how many installments are covered by the total amount paid.
      // Add a small tolerance (0.5) before flooring to avoid floating-point off-by-one:
      // e.g. 3000 / 1000.0001 ≈ 2.9999 which would incorrectly floor to 2.
      const installmentsPaid = Math.floor(
        ((loan.paidAmount || 0) + 0.5) / loan.emi,
      );

      const unpaidInstallments = [];
      for (let i = 1; i <= loan.duration; i++) {
        if (i > installmentsPaid) {
          const dueDate = new Date(loan.startDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          unpaidInstallments.push({
            installment: i,
            dueDate: dueDate,
            isOverdue: dueDate < today,
          });
        }
      }

      const overdue = unpaidInstallments.filter((inst) => inst.isOverdue);
      const remaining = unpaidInstallments.filter((inst) => !inst.isOverdue);

      const overdueAmount = overdue.length * loan.emi;
      const redistributionAmount =
        remaining.length > 0 ? overdueAmount / remaining.length : 0;

      // If we have remaining installments, redistribute overdue amounts to them
      if (remaining.length > 0) {
        remaining.forEach((inst) => {
          upcoming.push({
            _id: `${loan._id}-${inst.installment}`,
            loanId: loan._id,
            customer: loan.customer,
            amount: loan.emi + redistributionAmount,
            dueDate: inst.dueDate,
            installment: inst.installment,
            isOverdue: false,
          });
        });
      } else {
        // If no future installments left, keep overdue as is
        overdue.forEach((inst) => {
          upcoming.push({
            _id: `${loan._id}-${inst.installment}`,
            loanId: loan._id,
            customer: loan.customer,
            amount: loan.emi,
            dueDate: inst.dueDate,
            installment: inst.installment,
            isOverdue: true,
          });
        });
      }
    }

    // Sort by due date
    upcoming.sort((a, b) => a.dueDate - b.dueDate);

    res.json(upcoming);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLoan = async (req, res) => {
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

    // Delete associated repayments
    await Repayment.deleteMany({ loan: req.params.id });

    // Delete the loan
    await Loan.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_deleted',
      category: 'loan',
      details: `Deleted loan #${loan._id.toString().slice(-6).toUpperCase()} and its repayments`,
      metadata: {
        loanId: req.params.id,
        customerName: loan.customer?.name,
      },
      req,
    });

    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadDocument = async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const document = {
      name: req.body.name || req.file.originalname,
      url: req.file.path,
      type: req.file.mimetype,
    };

    loan.documents.push(document);
    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_document_uploaded',
      category: 'loan',
      details: `Uploaded document "${document.name}" for loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        documentName: document.name,
      },
      req,
    });

    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteDocument = async (req, res) => {
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

    const document = loan.documents.id(req.params.docId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from filesystem
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../', document.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    loan.documents.pull(req.params.docId);
    await loan.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'loan_document_deleted',
      category: 'loan',
      details: `Deleted document "${document.name}" for loan #${loan._id.toString().slice(-6).toUpperCase()}`,
      metadata: {
        loanId: loan._id,
        documentId: req.params.docId,
      },
      req,
    });

    res.json({ message: 'Document deleted', loan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLoans,
  getMyLoans,
  getLoanById,
  addRepayment,
  getRepayments,
  updateLoan,
  getUpcomingRepayments,
  deleteLoan,
  uploadDocument,
  deleteDocument,
};
