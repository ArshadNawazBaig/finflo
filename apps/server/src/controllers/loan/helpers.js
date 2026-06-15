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
// Resolve a grantor Member by _id → cnicHash → name (same fallback chain as
// createLoan). Returns the Member _id, or null if `identifier` is falsy, or
// undefined if an identifier was given but no member matched.
const resolveGrantorMember = async (identifier, ownerId) => {
  if (!identifier) return null;
  const { hash } = require('../../utils/encryption');
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Member.findOne({ _id: identifier, user: ownerId });
    if (byId) return byId._id;
  }
  let member = await Member.findOne({ user: ownerId, cnicHash: hash(identifier) });
  if (!member) {
    member = await Member.findOne({
      user: ownerId,
      name: String(identifier).toLowerCase().trim(),
    });
  }
  return member ? member._id : undefined;
};

// ── Renewal: close the old loan + disburse top-up cash ───────────────────────
// Shared by admin-direct renewals and approval of member renewal requests so
// the two paths can never diverge. Restructure model: rollover moves NO cash
// and is never counted as recovered; top-up disburses ONLY the extra above the
// carried-over balance. `newLoan` must already be saved.
const applyRenewalSettlement = async ({ oldLoan, newLoan, renewalType, req }) => {
  const ownerId = req.user.effectiveOwnerId;
  const oldOutstanding = oldLoan.remainingAmount || 0;

  // Close the old loan, disburse the top-up cash, credit the member's wallet and
  // book both ledger rows as ONE atomic unit. These are up to four documents;
  // without a transaction a mid-operation crash leaves the old loan closed with
  // no top-up disbursement (or a disbursement with no wallet credit) — the
  // orphan-row / missing-income drift the backfill scripts exist to repair.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Close the old loan — debt is moved into the new loan, not repaid.
      oldLoan.status = 'renewed';
      oldLoan.remainingAmount = 0;
      oldLoan.renewedTo = newLoan._id;
      oldLoan.lastRenewedAt = new Date();
      await oldLoan.save({ session });

      // 2. Top-up only: disburse the extra cash above the carried-over balance.
      if (renewalType === 'topup') {
        const extraCash = Math.max(
          0,
          roundMoney((newLoan.principal || 0) - oldOutstanding),
        );
        if (extraCash > 0) {
          const customerDoc = await Customer.findById(newLoan.customer).session(
            session,
          );
          await FinancialTransaction.create(
            [
              {
                user: ownerId,
                branchId: newLoan.branchId || customerDoc?.branchId,
                type: 'loan',
                category: 'loan_disbursement',
                amount: extraCash,
                date: new Date(),
                description: `Loan top-up disbursement (renewal) for ${customerDoc?.name || 'customer'}`,
                customer: newLoan.customer,
                member: customerDoc?.memberId || null,
                loan: newLoan._id,
                referenceId: newLoan._id,
                referenceModel: 'Loan',
                paymentMethod: 'online',
              },
            ],
            { session },
          );

          if (customerDoc?.isMember && customerDoc?.memberId) {
            const updatedMember = await Member.findByIdAndUpdate(
              customerDoc.memberId,
              { $inc: { currentBalance: extraCash, totalInvested: extraCash } },
              { new: true, session },
            );
            if (updatedMember) {
              await Investment.create(
                [
                  {
                    user: ownerId,
                    member: customerDoc.memberId,
                    branchId: newLoan.branchId || updatedMember.branchId,
                    type: 'deposit',
                    amount: extraCash,
                    balanceAfter: updatedMember.currentBalance,
                    description: `Loan Top-up — #${newLoan._id.toString().slice(-6).toUpperCase()}`,
                    date: new Date(),
                  },
                ],
                { session },
              );
            }
          }
        }
      }
    });
  } finally {
    await session.endSession();
  }

  // 3. Audit log
  await logActivity({
    userId: req.user?._id || ownerId,
    action: 'loan_renewed',
    category: 'loan',
    details: `Renewed loan #${oldLoan._id.toString().slice(-6).toUpperCase()} → #${newLoan._id.toString().slice(-6).toUpperCase()} (${renewalType})`,
    metadata: {
      oldLoanId: oldLoan._id,
      newLoanId: newLoan._id,
      renewalType,
    },
    req,
  });
};

module.exports = { resolveGrantorMember, applyRenewalSettlement };
