/**
 * Group-loan early-settlement quote + payment-method plumbing.
 *  - `quoteGroupSettlement` returns the EXACT discounted payoff per member (and
 *    total) that a settle payment would collect — read-only, no money moved.
 *  - `paymentMethod` ('cash' | 'online') flows through to the repayment's
 *    FinancialTransaction ledger row.
 *  - the quote is tenant-scoped (another owner → NotFound → 404).
 */
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const GroupLoan = require('../../src/models/GroupLoan');
const groupLoanService = require('../../src/services/groupLoanService');
const { makeOwner, makeCustomer, makeGroup } = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

// Approve a simple-interest group loan across two members (50k + 30k @ 24%/12mo).
// A simple loan's contractual total = principal + full-term interest, so settling
// on day 0 (~no elapsed interest) discounts the entire interest portion.
const seedApprovedGroupLoan = async (owner) => {
  const custA = await makeCustomer(owner, { name: 'alpha' });
  const custB = await makeCustomer(owner, { name: 'beta' });
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
  return groupLoan;
};

describe('quoteGroupSettlement', () => {
  it('returns the exact discounted payoff per member and in total', async () => {
    const owner = await makeOwner();
    const groupLoan = await seedApprovedGroupLoan(owner);

    const quote = await groupLoanService.quoteGroupSettlement(
      ownerReq(owner),
      groupLoan._id,
    );

    expect(quote.allocations).toHaveLength(2);
    // Settling on day 0 → payoff is just the principal (interest pro-rated to 0).
    const payoffs = quote.allocations.map((a) => a.payoff).sort((a, b) => b - a);
    expect(payoffs).toEqual([50000, 30000]);
    expect(quote.totalPayoff).toBe(80000);

    // Outstanding includes the full-term interest, so the payoff is discounted.
    expect(quote.totalOutstanding).toBeGreaterThan(quote.totalPayoff);
    expect(quote.totalDiscount).toBe(
      quote.totalOutstanding - quote.totalPayoff,
    );
    // Each member's discount is non-negative and reconciles its own row.
    quote.allocations.forEach((a) => {
      expect(a.payoff).toBeLessThanOrEqual(a.outstanding);
      expect(a.discount).toBe(a.outstanding - a.payoff);
    });
  });

  it('matches what a settle payment actually collects', async () => {
    const owner = await makeOwner();
    const groupLoan = await seedApprovedGroupLoan(owner);
    const req = ownerReq(owner);

    const quote = await groupLoanService.quoteGroupSettlement(req, groupLoan._id);
    const summary = await groupLoanService.processGroupRepayment(req, {
      groupLoanId: groupLoan._id,
      settle: true,
    });

    const collected = summary.applied.reduce((s, a) => s + a.amount, 0);
    expect(collected).toBe(quote.totalPayoff);
    expect(summary.applied.every((a) => a.settled)).toBe(true);
  });

  it('records the chosen paymentMethod on the repayment ledger row', async () => {
    const owner = await makeOwner();
    const groupLoan = await seedApprovedGroupLoan(owner);

    await groupLoanService.processGroupRepayment(ownerReq(owner), {
      groupLoanId: groupLoan._id,
      amount: 20000,
      paymentMethod: 'online',
      deductFromWallet: false,
    });

    const incomeTxns = await FinancialTransaction.find({
      user: owner._id,
      category: 'repayment',
    });
    expect(incomeTxns.length).toBeGreaterThan(0);
    expect(incomeTxns.every((t) => t.paymentMethod === 'online')).toBe(true);
  });

  it('defaults the paymentMethod to cash', async () => {
    const owner = await makeOwner();
    const groupLoan = await seedApprovedGroupLoan(owner);

    await groupLoanService.processGroupRepayment(ownerReq(owner), {
      groupLoanId: groupLoan._id,
      amount: 20000,
    });

    const incomeTxns = await FinancialTransaction.find({
      user: owner._id,
      category: 'repayment',
    });
    expect(incomeTxns.every((t) => t.paymentMethod === 'cash')).toBe(true);
  });

  it('does not quote another tenant’s group loan (NotFound → 404)', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const groupLoan = await seedApprovedGroupLoan(ownerA);

    await expect(
      groupLoanService.quoteGroupSettlement(ownerReq(ownerB), groupLoan._id),
    ).rejects.toBeInstanceOf(groupLoanService.NotFoundError);

    // And the cycle is untouched.
    const reloaded = await GroupLoan.findById(groupLoan._id);
    expect(reloaded.status).toBe('active');
  });
});
