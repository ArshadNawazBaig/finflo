/**
 * reportController — balance sheet footing after the loan-proceeds
 * reclassification (B5), per-branch analytics attribution, and accrued-to-date
 * term-deposit obligations (B4).
 */
const reportController = require('../../src/controllers/reportController');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeLoan,
  makeBranch,
  makeTermDeposit,
} = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const adminReq = (owner, extra = {}) => ({
  user: { effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false },
  query: {},
  ...extra,
});

describe('getBalanceSheet — footing with a loan-funded wallet (B5)', () => {
  it('balances when a wallet is funded by a loan disbursement', async () => {
    const owner = await makeOwner();
    await makeMember(owner, { currentBalance: 20000, totalInvested: 0, totalLoanProceeds: 20000 });
    await makeLoan(owner, await makeCustomer(owner), {
      principal: 20000,
      totalAmount: 24000,
      remainingAmount: 24000,
      outstandingPrincipal: 20000,
      paidAmount: 0,
      status: 'active',
    });

    const res = mockRes();
    await reportController.getBalanceSheet(adminReq(owner), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.balanceCheck.isBalanced).toBe(true);
    expect(res.body.assets.loansReceivable).toBe(20000);
    expect(res.body.liabilities.memberCurrentAccounts).toBe(20000);
  });
});

describe('getBranchSummary — loan attribution + deposits not inflated', () => {
  it('a loan-funded member shows Disbursed=principal and Deposits=0 on its branch', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner, { name: 'Main' });
    await makeMember(owner, {
      branchId: branch._id,
      currentBalance: 50000,
      totalInvested: 0,
      totalLoanProceeds: 50000,
    });
    await makeLoan(owner, await makeCustomer(owner), {
      branchId: branch._id,
      principal: 50000,
      totalAmount: 60000,
      remainingAmount: 60000,
      outstandingPrincipal: 50000,
      status: 'active',
    });

    const res = mockRes();
    await reportController.getBranchSummary(adminReq(owner), res);

    expect(res.statusCode).toBe(200);
    const card = res.body.find((b) => String(b._id) === String(branch._id));
    expect(card).toBeTruthy();
    expect(card.stats.totalVolume).toBe(50000); // Disbursed
    expect(card.stats.totalInvested).toBe(0); // Deposits — not inflated by proceeds
    expect(card.stats.activeLoans).toBe(1);
    expect(card.stats.totalOutstanding).toBe(60000);
  });
});

describe('getBalanceSheet — term deposit obligation accrues over the term (B4)', () => {
  it('uses accrued-to-date profit, not the full projected profit', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await makeTermDeposit(owner, member, {
      principal: 100000,
      profitRate: 12,
      projectedProfit: 12000,
    }); // mid-term by default factory dates (~50% elapsed)

    const res = mockRes();
    await reportController.getBalanceSheet(adminReq(owner), res);

    expect(res.statusCode).toBe(200);
    const obligation = res.body.liabilities.termDepositObligations;
    expect(obligation).toBeGreaterThan(105000); // principal + ~6000 accrued
    expect(obligation).toBeLessThan(107500);
    expect(obligation).toBeLessThan(112000); // would be 112000 under day-1 recognition
  });
});
