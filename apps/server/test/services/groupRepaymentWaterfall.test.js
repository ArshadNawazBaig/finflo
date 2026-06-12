/**
 * The group-repayment waterfall: a single group payment splits across members'
 * sub-loans summing to EXACTLY the payment (no paisa lost), AND a failure on any
 * sub-loan rolls back the WHOLE group payment (joint atomicity — no partial
 * collection, no orphan ledger rows).
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const Repayment = require('../../src/models/Repayment');
const GroupLoan = require('../../src/models/GroupLoan');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const groupLoanService = require('../../src/services/groupLoanService');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeGroup,
} = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

// Build an approved group loan across two members and return it.
const seedApprovedGroupLoan = async (owner, { withWallet } = {}) => {
  const mk = async (name) => {
    if (!withWallet) return makeCustomer(owner, { name });
    const member = await makeMember(owner, { currentBalance: 0 });
    return makeCustomer(owner, { name, isMember: true, memberId: member._id });
  };
  const custA = await mk('alpha');
  const custB = await mk('beta');
  const group = await makeGroup(owner, [custA, custB]);
  const req = ownerReq(owner);
  const groupLoan = await groupLoanService.createGroupLoan(req, {
    groupId: group._id,
    rate: 24,
    duration: 12,
    interestType: 'simple',
    allocations: [
      { customer: custA._id, principal: 50000 },
      { customer: custB._id, principal: 30000 },
    ],
  });
  await groupLoanService.approveGroupLoan(req, groupLoan._id);
  return { group, groupLoan };
};

describe('processGroupRepayment — waterfall', () => {
  it('splits a group payment across members summing to exactly the payment', async () => {
    const owner = await makeOwner();
    const { groupLoan } = await seedApprovedGroupLoan(owner);

    const req = ownerReq(owner);
    const summary = await groupLoanService.processGroupRepayment(req, {
      groupLoanId: groupLoan._id,
      amount: 20000,
      deductFromWallet: false,
    });

    // Portions reconcile to the payment exactly — no paisa invented or lost.
    const totalApplied = summary.applied.reduce((s, a) => s + a.amount, 0);
    expect(totalApplied).toBe(20000);
    expect(summary.applied).toHaveLength(2);

    // Roll-ups updated: total outstanding dropped by exactly the payment.
    const reloaded = await GroupLoan.findById(groupLoan._id);
    expect(reloaded.totalPaid).toBe(20000);
    // 62000 + 37200 (simple @24%/12mo) − 20000 collected = 79200.
    expect(reloaded.totalOutstanding).toBe(79200);
  });

  it('reports a shortfall when the payment exceeds total outstanding', async () => {
    const owner = await makeOwner();
    const { groupLoan } = await seedApprovedGroupLoan(owner);

    // Total outstanding is 99,200; overpay to 120,000. The engine caps each
    // member at what they owe, so the excess can't land — it must be surfaced.
    const summary = await groupLoanService.processGroupRepayment(ownerReq(owner), {
      groupLoanId: groupLoan._id,
      amount: 120000,
      deductFromWallet: false,
    });

    expect(summary.requested).toBe(120000);
    expect(summary.collected).toBeLessThan(summary.requested);
    expect(summary.shortfall).toBe(summary.requested - summary.collected);
    expect(summary.shortfall).toBeGreaterThan(0);
    // The reported collected equals the sum actually applied (no invented money).
    const totalApplied = summary.applied.reduce((s, a) => s + a.amount, 0);
    expect(totalApplied).toBe(summary.collected);
  });

  it('settles the entire cycle at the discounted payoff', async () => {
    const owner = await makeOwner();
    const { groupLoan } = await seedApprovedGroupLoan(owner);

    // settle: true with no amount pays off every active sub-loan. Paid same day
    // as start → simple-interest payoff is just principal (50000 + 30000), the
    // unaccrued interest is discounted away.
    const summary = await groupLoanService.processGroupRepayment(ownerReq(owner), {
      groupLoanId: groupLoan._id,
      settle: true,
      deductFromWallet: false,
    });

    expect(summary.applied).toHaveLength(2);
    expect(summary.applied.every((a) => a.settled)).toBe(true);
    // Payoff ≈ principal only (interest accrued over 0 days), well under the
    // 99,200 contractual remaining — and a discount is NOT a shortfall.
    expect(summary.collected).toBe(80000);
    expect(summary.shortfall).toBe(0);

    // Every sub-loan is now completed and the cycle is closed out.
    const subLoans = await Loan.find({ groupLoan: groupLoan._id });
    expect(subLoans.every((l) => l.status === 'completed')).toBe(true);
    const reloaded = await GroupLoan.findById(groupLoan._id);
    expect(reloaded.status).toBe('completed');
    expect(reloaded.totalOutstanding).toBe(0);
  });

  it('rolls back the whole group payment if one sub-loan fails', async () => {
    const owner = await makeOwner();
    const { groupLoan } = await seedApprovedGroupLoan(owner, { withWallet: true });

    // Approval credited the loan proceeds to each member's wallet. Drain them so
    // a wallet-deducted repayment must fail (insufficient funds) and abort the
    // whole transaction — proving no member is partially collected.
    await Member.updateMany({ user: owner._id }, { $set: { currentBalance: 0 } });

    const before = await Loan.find({ groupLoan: groupLoan._id }).sort({ principal: -1 });
    const beforeRemaining = before.map((l) => l.remainingAmount);

    await expect(
      groupLoanService.processGroupRepayment(ownerReq(owner), {
        groupLoanId: groupLoan._id,
        amount: 20000,
        deductFromWallet: true, // forces a wallet debit that can't be satisfied
      }),
    ).rejects.toThrow();

    // No partial collection: balances unchanged, zero repayment rows/ledger.
    const after = await Loan.find({ groupLoan: groupLoan._id }).sort({ principal: -1 });
    expect(after.map((l) => l.remainingAmount)).toEqual(beforeRemaining);
    expect(await Repayment.countDocuments({})).toBe(0);
    expect(
      await FinancialTransaction.countDocuments({ category: 'repayment' }),
    ).toBe(0);

    const reloaded = await GroupLoan.findById(groupLoan._id);
    expect(reloaded.totalPaid).toBe(0);
  });
});
