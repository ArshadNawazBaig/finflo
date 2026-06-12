const Customer = require('../models/Customer');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const FinancialTransaction = require('../models/FinancialTransaction');
const { roundMoney } = require('../utils/money');

/**
 * Disburse an approved loan's principal: write the disbursement ledger row and,
 * for member borrowers, credit the wallet + record the Investment ledger entry.
 *
 * This mirrors the disbursement block in loanController.approveLoan exactly so
 * the ledger shape stays identical between individual and group lending — but it
 * is session-aware so the group approval can disburse every member's sub-loan
 * inside a single transaction (all-or-nothing).
 *
 * @param {object} loan   A Loan document (already saved, status 'active').
 * @param {object} req    The authenticated request (for effectiveOwnerId).
 * @param {object} opts   { session } optional Mongoose session.
 */
const disburseLoan = async (loan, req, { session = null } = {}) => {
  // Resolve the customer (loan.customer may be an id or a populated doc).
  const customerDoc =
    loan.customer && typeof loan.customer === 'object' && loan.customer.name
      ? loan.customer
      : await Customer.findById(loan.customer).session(session);

  const ownerId = req.user.effectiveOwnerId;
  const branchId = loan.branchId || customerDoc?.branchId;

  // Disbursement ledger row (type 'loan' / category 'loan_disbursement').
  await FinancialTransaction.create(
    [
      {
        user: ownerId,
        branchId,
        type: 'loan',
        category: 'loan_disbursement',
        amount: loan.principal,
        date: new Date(),
        description: `Loan disbursement for ${customerDoc?.name || 'borrower'}`,
        customer: customerDoc?._id || loan.customer,
        member: customerDoc?.memberId || null,
        loan: loan._id,
        referenceId: loan._id,
        referenceModel: 'Loan',
        paymentMethod: 'online',
      },
    ],
    { session },
  );

  // Credit loan principal to the member's current account (members only).
  if (customerDoc?.isMember && customerDoc?.memberId) {
    const updatedMember = await Member.findByIdAndUpdate(
      customerDoc.memberId,
      // Loan proceeds credit the wallet but are NOT member capital — track them
      // in totalLoanProceeds, not totalInvested, so the deposit base stays clean.
      {
        $inc: {
          currentBalance: loan.principal,
          totalLoanProceeds: loan.principal,
        },
      },
      { new: true, session },
    );

    if (updatedMember) {
      await Investment.create(
        [
          {
            user: ownerId,
            member: customerDoc.memberId,
            branchId: branchId || updatedMember.branchId,
            type: 'loan_disbursement',
            amount: loan.principal,
            balanceAfter: updatedMember.currentBalance,
            loan: loan._id,
            description: `Loan Disbursement — #${loan._id.toString().slice(-6).toUpperCase()}`,
            date: new Date(),
          },
        ],
        { session },
      );
    }
  }
};

/**
 * Settle a loan renewal as part of a larger transaction: close the old loan
 * (debt moves into the new loan, not repaid) and, for a top-up, disburse only
 * the extra cash above the carried-over balance + credit the member's wallet.
 *
 * This is the session-aware twin of loanController.applyRenewalSettlement — that
 * one opens its own transaction (fine for a single individual loan); this one
 * runs inside the caller's session so a group renewal can settle every member's
 * sub-loan atomically.
 *
 * @param {object} oldLoan   The Loan being renewed (will be closed).
 * @param {object} newLoan   The replacement Loan (already saved).
 * @param {string} renewalType  'rollover' | 'topup'.
 * @param {object} req       Authenticated request (effectiveOwnerId).
 * @param {object} opts      { session }.
 */
const settleLoanRenewal = async (
  oldLoan,
  newLoan,
  renewalType,
  req,
  { session = null } = {},
) => {
  const ownerId = req.user.effectiveOwnerId;
  const oldOutstanding = oldLoan.remainingAmount || 0;

  // 1. Close the old loan — debt is carried into the new loan, not repaid.
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
      const customerDoc =
        newLoan.customer && typeof newLoan.customer === 'object' && newLoan.customer.name
          ? newLoan.customer
          : await Customer.findById(newLoan.customer).session(session);

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
            customer: newLoan.customer._id || newLoan.customer,
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
          {
            $inc: {
              currentBalance: extraCash,
              totalLoanProceeds: extraCash,
            },
          },
          { new: true, session },
        );
        if (updatedMember) {
          await Investment.create(
            [
              {
                user: ownerId,
                member: customerDoc.memberId,
                branchId: newLoan.branchId || updatedMember.branchId,
                type: 'loan_disbursement',
                amount: extraCash,
                balanceAfter: updatedMember.currentBalance,
                loan: newLoan._id,
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
};

module.exports = { disburseLoan, settleLoanRenewal };
