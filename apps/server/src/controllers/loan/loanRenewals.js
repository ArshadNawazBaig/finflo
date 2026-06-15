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
const { applyRenewalSettlement, resolveGrantorMember } = require('./helpers');

// ── Admin: renew a loan directly (rollover / top-up / extend) ─────────────────
const renewLoan = async (req, res) => {
  try {
    const oldLoan = await Loan.findById(req.params.id).populate('customer');
    if (
      !oldLoan ||
      (oldLoan.user.toString() !== req.user.effectiveOwnerId.toString() &&
        !(
          req.user.role === 'staff' &&
          oldLoan.branchId?.toString() === req.user.branchId?.toString()
        ))
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const {
      renewalType,
      principal,
      rate,
      duration,
      interestType,
      startDate,
      grantor1Identifier,
      grantor2Identifier,
      notes,
    } = req.body;

    if (!['rollover', 'topup', 'extend'].includes(renewalType)) {
      return res
        .status(400)
        .json({ message: 'renewalType must be rollover, topup, or extend.' });
    }

    if (['pending', 'rejected', 'renewed'].includes(oldLoan.status)) {
      return res
        .status(400)
        .json({ message: `Cannot renew a ${oldLoan.status} loan.` });
    }

    const ownerId = req.user.effectiveOwnerId;

    // ── EXTEND: mutate the same loan, no new loan, no ledger movement ──
    if (renewalType === 'extend') {
      const newDuration = duration ? Number(duration) : oldLoan.duration;
      if (!newDuration || newDuration < 1) {
        return res
          .status(400)
          .json({ message: 'A valid new duration (months) is required to extend.' });
      }
      let newRate =
        rate !== undefined && rate !== '' ? Number(rate) : oldLoan.rate;
      if (!newRate || newRate === 0) {
        const settings = await SystemSettings.getSettings();
        newRate = settings.defaultInterestRate || oldLoan.rate || 0;
      }
      const newInterestType = interestType || oldLoan.interestType || 'simple';
      const { emi, totalAmount } = computeLoanTerms(
        oldLoan.principal,
        newRate,
        newDuration,
        newInterestType,
      );

      oldLoan.rate = newRate;
      oldLoan.duration = newDuration;
      oldLoan.interestType = newInterestType;
      oldLoan.emi = emi;
      oldLoan.totalAmount = totalAmount;
      oldLoan.remainingAmount = Math.max(
        0,
        Math.round(totalAmount - (oldLoan.paidAmount || 0)),
      );
      oldLoan.renewalType = 'extend';
      oldLoan.renewalCount = (oldLoan.renewalCount || 0) + 1;
      oldLoan.lastRenewedAt = new Date();
      if (notes) oldLoan.notes = notes;
      // A balance after extending means the loan is live again; only a fully
      // covered balance stays/ becomes completed.
      oldLoan.status = oldLoan.remainingAmount <= 0 ? 'completed' : 'active';
      await oldLoan.save();

      await logActivity({
        userId: req.user._id,
        action: 'loan_renewed',
        category: 'loan',
        details: `Extended loan #${oldLoan._id.toString().slice(-6).toUpperCase()} to ${newDuration} months`,
        metadata: { loanId: oldLoan._id, renewalType: 'extend', newDuration },
        req,
      });

      return res.json(oldLoan);
    }

    // ── ROLLOVER / TOP-UP: create a new loan, then settle the old one ──
    const user = await User.findById(ownerId).select('plan');
    const loanCount = await Loan.countDocuments({ user: ownerId });
    const limitCheck = await canCreateLoan(user?.plan || 'Free', loanCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: user?.plan || 'Free',
        upgradeRequired: true,
      });
    }

    const oldOutstanding = oldLoan.remainingAmount || 0;

    let newPrincipal;
    if (renewalType === 'rollover') {
      newPrincipal = Math.round(oldOutstanding);
      if (newPrincipal <= 0) {
        return res.status(400).json({
          message:
            'Nothing outstanding to roll over. Use a top-up to issue a fresh amount.',
        });
      }
    } else {
      newPrincipal = Number(principal);
      if (!newPrincipal || newPrincipal <= oldOutstanding) {
        return res.status(400).json({
          message: `Top-up amount must be greater than the outstanding balance (Rs. ${Math.round(oldOutstanding).toLocaleString()}).`,
        });
      }
    }

    let newRate =
      rate !== undefined && rate !== '' ? Number(rate) : oldLoan.rate;
    if (!newRate || newRate === 0) {
      const settings = await SystemSettings.getSettings();
      newRate = settings.defaultInterestRate || 0;
    }
    const newDuration = duration ? Number(duration) : oldLoan.duration;
    const newInterestType = interestType || oldLoan.interestType || 'simple';

    const customer =
      oldLoan.customer && typeof oldLoan.customer === 'object'
        ? oldLoan.customer
        : await Customer.findById(oldLoan.customer);

    // Credit limit (members only, top-up issues new exposure).
    // This renewal is admin/manager/staff-initiated, so — like createLoan — we
    // don't block on the share-based limit (admins may lend to any member,
    // including those with no shares). We only recompute and store it for
    // display/reporting. The limit stays enforced on member self-service
    // requests (see requestLoan).
    if (customer?.memberId && renewalType === 'topup') {
      const member = await Member.findById(customer.memberId);
      if (member) {
        const effectiveCreditLimit = await calculateCreditLimit(member._id);
        await Member.findByIdAndUpdate(member._id, {
          creditLimit: effectiveCreditLimit,
        });
      }
    }

    // Grantors: carry over the old loan's unless overridden.
    let grantor1Id = oldLoan.grantor1 || undefined;
    let grantor2Id = oldLoan.grantor2 || undefined;
    if (grantor1Identifier) {
      const g = await resolveGrantorMember(grantor1Identifier, ownerId);
      if (!g) {
        return res
          .status(404)
          .json({ message: 'Grantor 1 not found. Provide a valid Member CNIC/phone.' });
      }
      grantor1Id = g;
    }
    if (grantor2Identifier) {
      const g = await resolveGrantorMember(grantor2Identifier, ownerId);
      if (!g) {
        return res
          .status(404)
          .json({ message: 'Grantor 2 not found. Provide a valid Member CNIC/phone.' });
      }
      grantor2Id = g;
    }
    if (
      grantor1Id &&
      grantor2Id &&
      grantor1Id.toString() === grantor2Id.toString()
    ) {
      return res
        .status(400)
        .json({ message: 'Grantor 1 and Grantor 2 must be different members.' });
    }

    const { emi, totalAmount } = computeLoanTerms(
      newPrincipal,
      newRate,
      newDuration,
      newInterestType,
    );

    const { getDefaultBranchId } = require('../../utils/branchUtils');
    const newLoan = new Loan({
      user: ownerId,
      customer: customer._id,
      branchId:
        oldLoan.branchId ||
        customer.branchId ||
        (await getDefaultBranchId(ownerId)),
      principal: newPrincipal,
      rate: newRate,
      duration: newDuration,
      emi,
      totalAmount,
      startDate: startDate ? new Date(startDate) : new Date(),
      remainingAmount: totalAmount,
      outstandingPrincipal: newPrincipal,
      paidAmount: 0,
      interestType: newInterestType,
      status: 'active',
      grantor1: grantor1Id,
      grantor1Status: grantor1Id ? 'approved' : 'pending',
      grantor2: grantor2Id,
      grantor2Status: grantor2Id ? 'approved' : 'pending',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      renewedFrom: oldLoan._id,
      renewalType,
      renewalCount: (oldLoan.renewalCount || 0) + 1,
      notes: notes || undefined,
    });
    await newLoan.save();

    await applyRenewalSettlement({ oldLoan, newLoan, renewalType, req });

    // Notify member
    try {
      if (customer?.isMember && customer?.memberId) {
        await createTransactionNotification({
          recipientId: customer.memberId,
          title: 'Loan Renewed',
          message: `Your loan has been renewed (${renewalType}). New loan amount: Rs. ${newPrincipal.toLocaleString()}.`,
          type: 'success',
          branchId: newLoan.branchId,
          action: 'loan_approved',
          metadata: { link: '/member/loans', loanId: newLoan._id },
        });
      }
    } catch (notifError) {
      console.error('Renewal notification error:', notifError);
    }

    return res.status(201).json(newLoan);
  } catch (error) {
    console.error('renewLoan Error:', error);
    return res.status(400).json({ message: error.message });
  }
};

// ── Member: request a renewal (rollover / top-up) for admin approval ──────────
const requestLoanRenewal = async (req, res) => {
  const {
    renewalType,
    principal: principalInput,
    duration: durationInput,
    notes,
    grantor1Identifier,
    grantor2Identifier,
  } = req.body;

  try {
    if (!['rollover', 'topup'].includes(renewalType)) {
      return res
        .status(400)
        .json({ message: 'renewalType must be rollover or topup.' });
    }

    const oldLoan = await Loan.findById(req.params.id);
    if (
      !oldLoan ||
      !req.member.customer ||
      oldLoan.customer.toString() !== req.member.customer.toString()
    ) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (!['active', 'overdue', 'completed'].includes(oldLoan.status)) {
      return res
        .status(400)
        .json({ message: `This loan (${oldLoan.status}) is not eligible for renewal.` });
    }

    const ownerId = oldLoan.user;
    const settings = await SystemSettings.getSettings();
    const rate = settings.defaultInterestRate || 0; // server-sourced, never client

    const oldOutstanding = oldLoan.remainingAmount || 0;
    let newPrincipal;
    if (renewalType === 'rollover') {
      newPrincipal = Math.round(oldOutstanding);
      if (newPrincipal <= 0) {
        return res.status(400).json({
          message:
            'Nothing outstanding to roll over. Request a top-up for a fresh amount.',
        });
      }
    } else {
      newPrincipal = Number(principalInput);
      if (!newPrincipal || newPrincipal <= oldOutstanding) {
        return res.status(400).json({
          message: `Top-up amount must be greater than your outstanding balance (Rs. ${Math.round(oldOutstanding).toLocaleString()}).`,
        });
      }
    }

    const duration = durationInput ? Number(durationInput) : oldLoan.duration;
    const interestType = oldLoan.interestType || 'simple';

    // Carry over grantors unless the member supplied new ones.
    let grantor1Id = oldLoan.grantor1 || undefined;
    let grantor2Id = oldLoan.grantor2 || undefined;
    if (grantor1Identifier) {
      const g = await resolveGrantorMember(grantor1Identifier, ownerId);
      if (!g) {
        return res.status(404).json({ message: 'Grantor 1 not found.' });
      }
      grantor1Id = g;
    }
    if (grantor2Identifier) {
      const g = await resolveGrantorMember(grantor2Identifier, ownerId);
      if (!g) {
        return res.status(404).json({ message: 'Grantor 2 not found.' });
      }
      grantor2Id = g;
    }

    const { emi, totalAmount } = computeLoanTerms(
      newPrincipal,
      rate,
      duration,
      interestType,
    );

    const { getDefaultBranchId: getDefaultBranchIdForRenewal } = require('../../utils/branchUtils');
    const renewalBranchId =
      oldLoan.branchId || (await getDefaultBranchIdForRenewal(ownerId));
    const newLoan = new Loan({
      user: ownerId,
      customer: oldLoan.customer,
      branchId: renewalBranchId,
      principal: newPrincipal,
      rate,
      duration,
      emi,
      totalAmount,
      startDate: new Date(),
      remainingAmount: totalAmount,
      outstandingPrincipal: newPrincipal,
      paidAmount: 0,
      interestType,
      status: 'pending',
      grantor1: grantor1Id,
      grantor1Status: 'pending',
      grantor2: grantor2Id,
      grantor2Status: 'pending',
      renewedFrom: oldLoan._id,
      renewalType,
      renewalCount: (oldLoan.renewalCount || 0) + 1,
      notes: notes || undefined,
    });
    await newLoan.save();

    // Notify admins/branch managers/owner
    try {
      await notifyAdminsOfMemberAction({
        title: 'Loan Renewal Requested',
        message: `${req.member.name || 'A member'} requested a ${renewalType} renewal for Rs. ${newPrincipal.toLocaleString()}.`,
        type: 'info',
        branchId: oldLoan.branchId,
        ownerId,
        link: '/loans',
        metadata: { loanId: newLoan._id, renewalType },
      });
    } catch (notifError) {
      console.error('Renewal request notification error:', notifError);
    }

    return res.status(201).json(newLoan);
  } catch (error) {
    console.error('requestLoanRenewal Error:', error);
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  renewLoan,
  requestLoanRenewal,
};
