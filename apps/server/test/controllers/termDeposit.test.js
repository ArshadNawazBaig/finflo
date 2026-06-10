/**
 * termDepositController — locking funds (create), full-profit payout (mature) and
 * pro-rated early break with penalty. Each path moves money between the member
 * wallet and the deposit, and books the matching ledger / equity rows.
 */
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const ProfitDistribution = require('../../src/models/ProfitDistribution');
const TermDeposit = require('../../src/models/TermDeposit');
const tdc = require('../../src/controllers/termDepositController');
const { makeOwner, makeMember, makeTermDeposit } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');
const mongoose = require('mongoose');

const adminReq = (owner, over = {}) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin' },
  body: {},
  params: {},
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  ...over,
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('createTermDeposit', () => {
  const ownerWithRates = () =>
    makeOwner({ termDepositRates: [{ duration: 12, rate: 12 }], termDepositEarlyBreakPenalty: 20 });

  it('400s on missing fields', async () => {
    const owner = await ownerWithRates();
    const res = mockRes();
    await tdc.createTermDeposit(adminReq(owner, { body: { principal: 1000 } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s on insufficient balance', async () => {
    const owner = await ownerWithRates();
    const member = await makeMember(owner, { currentBalance: 1000 });
    const res = mockRes();
    await tdc.createTermDeposit(
      adminReq(owner, { body: { memberId: String(member._id), principal: 50000, duration: 12 } }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  it('locks the principal, books the ledger, and computes projected profit', async () => {
    const owner = await ownerWithRates();
    const member = await makeMember(owner, { currentBalance: 100000 });
    const res = mockRes();
    await tdc.createTermDeposit(
      adminReq(owner, { body: { memberId: String(member._id), principal: 50000, duration: 12 } }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.projectedProfit).toBe(6000); // 50000 × 12% × 12/12
    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(50000); // 100000 − 50000 locked
    expect(await Investment.countDocuments({ member: member._id, type: 'withdrawal' })).toBe(1);
    expect(await FinancialTransaction.countDocuments({ member: member._id, category: 'term_deposit', type: 'debit' })).toBe(1);
  });
});

describe('matureTermDeposit', () => {
  it('credits principal + full projected profit and books equity', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    const td = await makeTermDeposit(owner, member, { principal: 50000, profitRate: 12, projectedProfit: 6000 });

    const res = mockRes();
    await tdc.matureTermDeposit(adminReq(owner, { params: { id: String(td._id) } }), res);

    expect(res.statusCode).toBe(200);
    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(56000);
    expect(fresh.totalProfit).toBe(6000);
    expect((await TermDeposit.findById(td._id)).status).toBe('matured');
    const pd = await ProfitDistribution.findOne({ member: member._id, type: 'term_deposit' });
    expect(pd.amount).toBe(6000);
  });

  it('400s when the deposit is not active', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const td = await makeTermDeposit(owner, member, { status: 'matured' });
    const res = mockRes();
    await tdc.matureTermDeposit(adminReq(owner, { params: { id: String(td._id) } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('404s for another tenant’s deposit', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const member = await makeMember(owner);
    const td = await makeTermDeposit(owner, member);
    const res = mockRes();
    await tdc.matureTermDeposit(adminReq(other, { params: { id: String(td._id) } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('breakTermDeposit (early)', () => {
  it('pays pro-rated profit minus penalty and books the penalty as fee income', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    // 6 months into a 12-month deposit → half the 6000 projected profit = 3000;
    // 20% penalty → member keeps 2400, business keeps 600.
    const td = await makeTermDeposit(owner, member, {
      principal: 50000, profitRate: 12, projectedProfit: 6000, duration: 12,
      earlyBreakPenaltyRate: 20, startDate: daysAgo(180),
    });

    const res = mockRes();
    await tdc.breakTermDeposit(adminReq(owner, { params: { id: String(td._id) } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.actualProfit).toBe(2400);
    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(52400); // 50000 + 2400
    expect((await TermDeposit.findById(td._id)).status).toBe('broken');
    const fee = await FinancialTransaction.findOne({ member: member._id, category: 'term_deposit_break_fee' });
    expect(fee.amount).toBe(600);
  });

  it('404s for a missing deposit', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await tdc.breakTermDeposit(adminReq(owner, { params: { id: String(new mongoose.Types.ObjectId()) } }), res);
    expect(res.statusCode).toBe(404);
  });
});
