/**
 * memberController money paths — deposit/withdraw atomicity and the
 * largest-remainder profit distribution that conserves the declared pool.
 */
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const ProfitDistribution = require('../../src/models/ProfitDistribution');
const memberController = require('../../src/controllers/memberController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

describe('addInvestment / withdrawInvestment — atomicity & balance', () => {
  it('addInvestment credits balance and writes BOTH ledgers', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    const req = { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 7000 } };
    const res = mockRes();
    await memberController.addInvestment(req, res);

    expect(res.statusCode).toBe(201);
    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(7000);
    expect(await Investment.countDocuments({ member: member._id, type: 'deposit' })).toBe(1);
    expect(await FinancialTransaction.countDocuments({ member: member._id, type: 'credit' })).toBe(1);
  });

  it('withdrawInvestment blocks an overdraft (atomic $gte) and writes nothing', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1000 });
    const req = { ...ownerReq(owner), params: { id: String(member._id) }, body: { amount: 5000 } };
    const res = mockRes();
    await memberController.withdrawInvestment(req, res);

    expect(res.statusCode).toBe(400);
    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(1000);
    expect(await Investment.countDocuments({ member: member._id, type: 'withdrawal' })).toBe(0);
  });
});

describe('distributeProfit — pool conservation (largest remainder)', () => {
  it('credits members so the sum equals the declared pool EXACTLY (no rupee lost)', async () => {
    const owner = await makeOwner();
    const members = await Promise.all([makeMember(owner), makeMember(owner), makeMember(owner)]);

    const before = new Date('2026-01-01');
    for (const m of members) {
      await Investment.create({ user: owner._id, member: m._id, type: 'deposit', amount: 10000, date: before });
    }

    const req = {
      ...ownerReq(owner),
      body: { totalProfit: 100, period: 'Feb 2026', startDate: '2026-02-01', endDate: '2026-02-28' },
    };
    const res = mockRes();
    await memberController.distributeProfit(req, res);

    expect(res.statusCode).toBe(201);
    const dist = await ProfitDistribution.find({ user: owner._id });
    expect(dist.reduce((s, d) => s + d.amount, 0)).toBe(100);
    expect(res.body.totalDistributed).toBe(100);

    const fresh = await Member.find({ user: owner._id });
    expect(fresh.reduce((s, m) => s + m.currentBalance, 0)).toBe(100);
  });
});
