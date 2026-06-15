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
const bulkApproveLoans = async (req, res) => {
  try {
    const { loanIds, notes } = req.body;
    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({ message: 'No loans selected' });
    }

    const processed = [];
    const failed = [];

    for (const id of loanIds) {
      try {
        const loan = await Loan.findById(id).populate('customer');
        if (!loan || loan.status !== 'pending') {
          failed.push({ id, reason: 'Not found or not pending' });
          continue;
        }

        if (
          loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
          !(
            req.user.role === 'staff' &&
            loan.branchId?.toString() === req.user.branchId?.toString()
          )
        ) {
          failed.push({ id, reason: 'Not authorized' });
          continue;
        }

        loan.status = 'active';
        loan.approvedBy = req.user._id;
        loan.approvedAt = new Date();
        loan.startDate = new Date();

        await loan.save();

        const financialTx = new FinancialTransaction({
          user: req.user.effectiveOwnerId,
          branchId:
            loan.branchId || (await Customer.findById(loan.customer))?.branchId,
          type: 'loan',
          category: 'loan_disbursement',
          amount: loan.principal,
          date: new Date(),
          description: `Bulk disbursement for ${loan.customer.name}${notes ? ` - ${notes}` : ''}`,
          customer: loan.customer._id || loan.customer,
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
            // Loan proceeds → totalLoanProceeds, not totalInvested (not capital).
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
              description: `Loan Disbursement (Bulk) — #${loan._id.toString().slice(-6).toUpperCase()}`,
              date: new Date(),
            });
          }
        }

        await logActivity({
          userId: req.user._id,
          action: 'loan_approved',
          category: 'loan',
          details: `Approved loan #${loan._id.toString().slice(-6).toUpperCase()} via Bulk Action${notes ? ` (${notes})` : ''}`,
          metadata: { loanId: loan._id, customerId: loan.customer, bulk: true },
          req,
        });

        const customer = await Customer.findById(loan.customer);
        if (customer && customer.isMember && customer.memberId) {
          await Notification.create({
            recipient: customer.memberId,
            recipientModel: 'Member',
            title: 'Loan Approved',
            message: `Your loan request for Rs. ${loan.principal.toLocaleString()} has been approved and credited to your current account.`,
            type: 'success',
            link: '/member/loans',
            action: 'loan_approved',
          }).catch(() => {});

          if (customer.email) {
            const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, loan.branchId);

            sendEmailAsync({
              to: customer.email,
              subject: `Loan Approved - ${branchName}`,
              html: transactionEmail({
                memberName: customer.name,
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
        }

        processed.push(id);
      } catch (err) {
        failed.push({ id, reason: err.message });
      }
    }

    res.json({
      message: 'Bulk approval complete',
      processedCount: processed.length,
      failedCount: failed.length,
      failed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkRejectLoans = async (req, res) => {
  try {
    const { loanIds, reason } = req.body;
    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({ message: 'No loans selected' });
    }

    const processed = [];
    const failed = [];

    for (const id of loanIds) {
      try {
        const loan = await Loan.findById(id);
        if (!loan || loan.status !== 'pending') {
          failed.push({ id, reason: 'Not found or not pending' });
          continue;
        }

        if (
          loan.user.toString() !== req.user.effectiveOwnerId.toString() &&
          !(
            req.user.role === 'staff' &&
            loan.branchId?.toString() === req.user.branchId?.toString()
          )
        ) {
          failed.push({ id, reason: 'Not authorized' });
          continue;
        }

        loan.status = 'rejected';
        loan.rejectedBy = req.user._id;
        loan.rejectionReason = reason;

        await loan.save();

        await logActivity({
          userId: req.user._id,
          action: 'loan_rejected',
          category: 'loan',
          details: `Rejected loan #${loan._id.toString().slice(-6).toUpperCase()} via Bulk Action`,
          metadata: { loanId: loan._id, reason, bulk: true },
          req,
        });

        const customer = await Customer.findById(loan.customer);
        if (customer && customer.isMember && customer.memberId) {
          await Notification.create({
            recipient: customer.memberId,
            recipientModel: 'Member',
            title: 'Loan Rejected',
            message: `Your loan request for ${loan.principal} has been rejected. Reason: ${reason || 'Not specified'}`,
            type: 'error',
            link: '/member/loans',
            action: 'loan_rejected',
          }).catch(() => {});

          if (customer.email) {
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
        }

        processed.push(id);
      } catch (err) {
        failed.push({ id, reason: err.message });
      }
    }

    res.json({
      message: 'Bulk rejection complete',
      processedCount: processed.length,
      failedCount: failed.length,
      failed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Minimal CSV parser (RFC 4180-ish) — same approach as the member importer.
const parseLoanCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
};

const parseLoanDate = (s) => {
  if (!s) return null;
  const str = String(s).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str)
    ? new Date(`${str}T00:00:00.000Z`)
    : new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// ── Bulk Import Historical Loans (CSV) ───────────────────────────────────────
// Writes loans directly (bypassing the pending→approve flow) so REAL historical
// dates are preserved (createdAt = startDate) and the ledger stays consistent:
// each row produces a Loan + disbursement transaction, plus a consolidated
// Repayment + income transaction when amountPaid > 0. Re-runnable: a row is
// skipped if a loan already exists for the same customer + principal + startDate.
const bulkImportLoans = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    // Loans must be attributed to a branch — block imports until the tenant has
    // one, and fall back to the default branch for admin-issued loans.
    const { getDefaultBranchId, hasAnyBranch } = require('../../utils/branchUtils');
    if (!(await hasAnyBranch(ownerId))) {
      return res.status(400).json({
        message: 'Create a branch before importing loans.',
        code: 'NO_BRANCH',
      });
    }
    const branchId = req.user.branchId || (await getDefaultBranchId(ownerId));

    const { hash } = require('../../utils/encryption');
    const csvText = req.file.buffer.toString('utf8').replace(/^﻿/, '');
    const rows = parseLoanCsv(csvText);
    if (rows.length < 2) {
      return res.status(400).json({
        message: 'CSV must contain a header row and at least one data row',
      });
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);
    const col = (name) => header.indexOf(name.toLowerCase());
    const required = [
      'borrowername',
      'borrowercnic',
      'borrowerphone',
      'borroweremail',
      'principal',
      'rate',
      'durationmonths',
      'startdate',
    ];
    for (const r of required) {
      if (col(r) === -1) {
        return res.status(400).json({ message: `Missing required column: "${r}"` });
      }
    }
    const get = (row, name) => {
      const i = col(name);
      return i === -1 ? '' : String(row[i] ?? '').trim();
    };

    // Plan limit — bail early if even the optimistic count would exceed it.
    const user = await User.findById(ownerId).select('plan customerCount');
    const userPlan = user?.plan || 'Free';
    const existingLoanCount = await Loan.countDocuments({ user: ownerId });
    const limitCheck = await canCreateLoan(userPlan, existingLoanCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }
    let headroom = (limitCheck.limit ?? Infinity) - existingLoanCount;

    const VALID_STATUS = ['active', 'completed', 'overdue', 'defaulted'];
    const VALID_INTEREST = ['simple', 'emi', 'compound'];
    const errors = [];
    let created = 0;

    for (let idx = 0; idx < dataRows.length; idx++) {
      const row = dataRows[idx];
      const rowNo = idx + 2; // header = row 1
      try {
        const name = get(row, 'borrowername');
        const cnic = get(row, 'borrowercnic');
        const phone = get(row, 'borrowerphone');
        const email = get(row, 'borroweremail').toLowerCase();
        const principal = Number(get(row, 'principal'));
        const rate = Number(get(row, 'rate'));
        const duration = Number(get(row, 'durationmonths'));
        const interestType = (get(row, 'interesttype') || 'simple').toLowerCase();
        const startDate = parseLoanDate(get(row, 'startdate'));
        let status = (get(row, 'status') || '').toLowerCase();
        const amountPaid = Number(get(row, 'amountpaid') || 0);
        const lastPaymentDate = parseLoanDate(get(row, 'lastpaymentdate')) || startDate;
        const notes = get(row, 'notes');

        const errs = [];
        if (!name) errs.push('borrowerName empty');
        if (!cnic) errs.push('borrowerCnic empty');
        if (!phone) errs.push('borrowerPhone empty');
        if (!email) errs.push('borrowerEmail empty');
        if (!(principal > 0)) errs.push('principal must be > 0');
        if (!(rate >= 0)) errs.push('rate invalid');
        if (!(duration > 0)) errs.push('durationMonths must be > 0');
        if (!startDate) errs.push('startDate invalid (use YYYY-MM-DD)');
        if (!VALID_INTEREST.includes(interestType))
          errs.push(`interestType must be ${VALID_INTEREST.join('/')}`);
        if (status && !VALID_STATUS.includes(status))
          errs.push(`status must be ${VALID_STATUS.join('/')}`);
        if (Number.isNaN(amountPaid) || amountPaid < 0) errs.push('amountPaid invalid');
        if (errs.length) {
          errors.push({ row: rowNo, message: errs.join('; ') });
          continue;
        }

        if (headroom <= 0) {
          errors.push({
            row: rowNo,
            message: `Plan loan limit (${limitCheck.limit}) reached — upgrade to import more`,
          });
          continue;
        }

        // Totals (mirrors createLoan math)
        let emi;
        let totalAmount;
        if (interestType === 'emi') {
          emi = calculateEMI(principal, rate, duration);
          totalAmount = emi * duration;
        } else {
          const totalInterest = (principal * rate * duration) / 1200;
          totalAmount = principal + totalInterest;
          emi = totalAmount / duration;
        }
        const totalRounded = Math.round(totalAmount);
        const paid = Math.min(amountPaid, totalRounded);
        const remaining = Math.max(0, totalRounded - paid);
        if (!status) status = remaining <= 0 ? 'completed' : 'active';

        // Find or create the borrower (customer)
        let customer =
          (await Customer.findOne({ user: ownerId, cnicHash: hash(cnic) })) ||
          (await Customer.findOne({ user: ownerId, email }));
        if (!customer) {
          customer = new Customer({
            user: ownerId,
            branchId: branchId || undefined,
            name,
            email,
            phone,
            cnic,
            status: 'Active',
          });
          await customer.save(); // hooks: encrypt PII + generate account numbers
          await User.findByIdAndUpdate(ownerId, { $inc: { customerCount: 1 } });
        }

        // Idempotency guard
        const existing = await Loan.findOne({
          user: ownerId,
          customer: customer._id,
          principal,
          startDate,
        });
        if (existing) {
          errors.push({
            row: rowNo,
            message: `Already imported (${name}, Rs ${principal} @ ${get(row, 'startdate')})`,
          });
          continue;
        }

        // Insert loan via native driver so createdAt = startDate (bypass timestamps)
        const now = new Date();
        const { insertedId: loanId } = await Loan.collection.insertOne({
          user: ownerId,
          customer: customer._id,
          ...(branchId ? { branchId } : {}),
          principal,
          rate,
          duration,
          emi: Math.round(emi),
          totalAmount: totalRounded,
          startDate,
          status,
          paidAmount: paid,
          remainingAmount: remaining,
          interestType,
          notes: notes || undefined,
          approvedAt: startDate,
          approvedBy: ownerId,
          createdAt: startDate,
          updatedAt: now,
        });

        // Disbursement transaction (cash out), dated startDate
        await FinancialTransaction.collection.insertOne({
          user: ownerId,
          ...(branchId ? { branchId } : {}),
          type: 'loan',
          category: 'loan_disbursement',
          amount: principal,
          date: startDate,
          status: 'Completed',
          description: `Historical loan disbursement for ${name}`,
          customer: customer._id,
          member: customer.memberId || null,
          loan: loanId,
          referenceId: loanId,
          referenceModel: 'Loan',
          paymentMethod: 'cash',
          createdAt: startDate,
          updatedAt: now,
        });

        // Consolidated repayment + income transaction (if any paid)
        if (paid > 0) {
          const totalInterest = totalRounded - principal;
          const interestPortion =
            totalInterest > 0 ? Math.round((paid * totalInterest) / totalRounded) : 0;
          const principalPortion = paid - interestPortion;
          const repayDate = lastPaymentDate || startDate;

          const { insertedId: repayId } = await Repayment.collection.insertOne({
            user: ownerId,
            loan: loanId,
            customer: customer._id,
            ...(branchId ? { branchId } : {}),
            amount: paid,
            interestAmount: interestPortion,
            principalAmount: principalPortion,
            date: repayDate,
            status: 'Completed',
            notes: 'Historical import — consolidated repayment',
            createdAt: repayDate,
            updatedAt: now,
          });

          await FinancialTransaction.collection.insertOne({
            user: ownerId,
            ...(branchId ? { branchId } : {}),
            type: 'income',
            category: 'repayment',
            amount: paid,
            date: repayDate,
            status: 'Completed',
            description: `Historical loan repayment for ${name}`,
            customer: customer._id,
            member: customer.memberId || null,
            loan: loanId,
            referenceId: repayId,
            referenceModel: 'Repayment',
            paymentMethod: 'cash',
            createdAt: repayDate,
            updatedAt: now,
          });
        }

        created++;
        headroom--;
      } catch (rowErr) {
        errors.push({ row: rowNo, message: rowErr.message || 'Failed to import' });
      }
    }

    return res.status(200).json({
      total: dataRows.length,
      created,
      errors,
    });
  } catch (error) {
    console.error('bulkImportLoans Error:', error);
    return res.status(500).json({ message: 'Failed to import loans CSV' });
  }
};

module.exports = {
  bulkApproveLoans,
  bulkRejectLoans,
  bulkImportLoans,
};
