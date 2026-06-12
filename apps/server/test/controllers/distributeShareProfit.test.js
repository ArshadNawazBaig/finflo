/**
 * distributeShareProfit — credits each share-holding member's shareBalance +
 * totalShareProfit, books a BusinessShare record, a ProfitDistribution row and a
 * FinancialTransaction ledger row, each member's set wrapped in a transaction.
 * Asserts the pool reconciles and that a mid-loop failure rolls the failing
 * member back completely (shareBalance unchanged, no orphan rows).
 */
const Member = require('../../src/models/Member');
const BusinessShare = require('../../src/models/BusinessShare');
const ProfitDistribution = require('../../src/models/ProfitDistribution');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const {
  distributeShareProfit,
} = require('../../src/controllers/memberController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const DAY = 24 * 60 * 60 * 1000;
const periodStart = new Date('2026-01-01T00:00:00.000Z');
const periodEnd = new Date('2026-01-31T23:59:59.999Z');

// Seed a member holding shares: shareBalance > 0 (so the query picks them up)
// plus a share_deposit dated before the period so the weighted share balance
// over the period equals the deposit.
const seedShareMember = async (owner, amount, overrides = {}) => {
  const member = await makeMember(owner, { shareBalance: amount, ...overrides });
  await BusinessShare.create({
    user: owner._id,
    member: member._id,
    branchId: member.branchId,
    type: 'share_deposit',
    amount,
    date: new Date(periodStart.getTime() - 10 * DAY),
  });
  return member;
};

describe('distributeShareProfit', () => {
  it('proportional path: sum of share-profit payouts reconciles to the pool', async () => {
    const owner = await makeOwner();
    const m1 = await seedShareMember(owner, 30000);
    const m2 = await seedShareMember(owner, 70000);

    const req = ownerReq(owner, {
      body: {
        totalProfit: 1000,
        period: 'Jan 2026',
        startDate: periodStart,
        endDate: periodEnd,
      },
    });
    const res = mockRes();
    await distributeShareProfit(req, res);

    expect(res.statusCode).toBe(201);

    const dists = await ProfitDistribution.find({
      user: owner._id,
      type: 'share',
    });
    const sum = dists.reduce((s, d) => s + d.amount, 0);
    expect(sum).toBe(1000); // pool conserved exactly

    // Share path credits shareBalance + totalShareProfit (NOT currentBalance).
    const d1 = dists.find((d) => String(d.member) === String(m1._id));
    const fresh1 = await Member.findById(m1._id);
    expect(fresh1.shareBalance).toBe(30000 + d1.amount);
    expect(fresh1.totalShareProfit).toBe(d1.amount);
    expect(fresh1.currentBalance).toBe(0); // untouched
    expect(fresh1.totalProfit).toBe(0); // untouched

    // shareBalanceAfter snapshot is consistent with the credited balance.
    const share1 = await BusinessShare.findOne({
      member: m1._id,
      type: 'share_profit',
    });
    expect(share1.shareBalanceAfter).toBe(30000 + d1.amount);

    expect(
      await FinancialTransaction.countDocuments({
        user: owner._id,
        category: 'profit_distribution',
      }),
    ).toBe(dists.length);
  });

  it('rolls back the failing member entirely when a write throws mid-loop', async () => {
    const owner = await makeOwner();
    const m1 = await seedShareMember(owner, 50000);
    const m2 = await seedShareMember(owner, 50000);

    // Throw on the SECOND FinancialTransaction.create (2nd member's set).
    const original = FinancialTransaction.create.bind(FinancialTransaction);
    let calls = 0;
    const spy = vi
      .spyOn(FinancialTransaction, 'create')
      .mockImplementation((...args) => {
        calls += 1;
        if (calls === 2) throw new Error('boom: share ledger write failed');
        return original(...args);
      });

    const req = ownerReq(owner, {
      body: {
        totalProfit: 1000,
        period: 'Jan 2026',
        startDate: periodStart,
        endDate: periodEnd,
      },
    });
    const res = mockRes();
    await distributeShareProfit(req, res);
    spy.mockRestore();

    expect(res.statusCode).toBe(500);

    const dists = await ProfitDistribution.find({
      user: owner._id,
      type: 'share',
    });
    expect(dists.length).toBe(1); // only the first member committed

    const committedMemberId = String(dists[0].member);
    const failedMemberId =
      committedMemberId === String(m1._id) ? m2._id : m1._id;

    // Failed member: shareBalance unchanged, NO orphan BusinessShare profit row,
    // NO orphan distribution/ledger row.
    const failed = await Member.findById(failedMemberId);
    expect(failed.shareBalance).toBe(50000);
    expect(failed.totalShareProfit).toBe(0);
    expect(
      await BusinessShare.countDocuments({
        member: failedMemberId,
        type: 'share_profit',
      }),
    ).toBe(0);
    expect(
      await ProfitDistribution.countDocuments({ member: failedMemberId }),
    ).toBe(0);
    expect(
      await FinancialTransaction.countDocuments({ member: failedMemberId }),
    ).toBe(0);

    // Committed member: shareBalance bumped, one ledger row.
    const committed = await Member.findById(committedMemberId);
    expect(committed.shareBalance).toBe(50000 + dists[0].amount);
    expect(
      await FinancialTransaction.countDocuments({ member: committedMemberId }),
    ).toBe(1);
  });

  it('rejects an invalid pool with 400 (non-custom)', async () => {
    const owner = await makeOwner();
    const req = ownerReq(owner, { body: { totalProfit: 0 } });
    const res = mockRes();
    await distributeShareProfit(req, res);
    expect(res.statusCode).toBe(400);
  });
});
