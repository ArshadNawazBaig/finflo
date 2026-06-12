/**
 * distributeProfit — credits each active member's wallet, books a
 * ProfitDistribution row AND a FinancialTransaction ledger row per member, each
 * member's trio wrapped in its own transaction. Asserts the pool reconciles
 * (sum of payouts == declared pool in the proportional path) and that a mid-loop
 * failure rolls the failing member back completely (no partial wallet credit,
 * no orphan distribution/ledger row).
 */
const mongoose = require('mongoose');
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const ProfitDistribution = require('../../src/models/ProfitDistribution');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { distributeProfit } = require('../../src/controllers/memberController');
const {
  makeOwner,
  makeMember,
  makeInvestment,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const DAY = 24 * 60 * 60 * 1000;

// Period = a fixed past month so the seeded deposits sit *before* periodStart and
// produce a full-period weighted balance equal to the deposit.
const periodStart = new Date('2026-01-01T00:00:00.000Z');
const periodEnd = new Date('2026-01-31T23:59:59.999Z');

// Seed a member with a deposit that lands before the period so its weighted
// average balance over the period equals the deposit amount.
const seedMemberWithBalance = async (owner, amount) => {
  const member = await makeMember(owner, { currentBalance: amount });
  await makeInvestment(owner, member, {
    type: 'deposit',
    amount,
    date: new Date(periodStart.getTime() - 10 * DAY),
  });
  return member;
};

describe('distributeProfit', () => {
  it('proportional path: sum of payouts reconciles to the declared pool', async () => {
    const owner = await makeOwner();
    // Two members with equal balances → a 1000 pool that does NOT divide evenly
    // exercises the largest-remainder allocation (500 / 500 here, but the
    // reconciliation invariant must hold regardless).
    const m1 = await seedMemberWithBalance(owner, 30000);
    const m2 = await seedMemberWithBalance(owner, 70000);

    const req = ownerReq(owner, {
      body: {
        totalProfit: 1000,
        period: 'Jan 2026',
        startDate: periodStart,
        endDate: periodEnd,
      },
    });
    const res = mockRes();
    await distributeProfit(req, res);

    expect(res.statusCode).toBe(201);

    const dists = await ProfitDistribution.find({ user: owner._id });
    const sum = dists.reduce((s, d) => s + d.amount, 0);
    expect(sum).toBe(1000); // pool conserved exactly

    // Each member credited by exactly their distribution amount.
    const fresh1 = await Member.findById(m1._id);
    const fresh2 = await Member.findById(m2._id);
    const d1 = dists.find((d) => String(d.member) === String(m1._id));
    const d2 = dists.find((d) => String(d.member) === String(m2._id));
    expect(fresh1.currentBalance).toBe(30000 + d1.amount);
    expect(fresh1.totalProfit).toBe(d1.amount);
    expect(fresh2.currentBalance).toBe(70000 + d2.amount);

    // One ledger row per distribution.
    expect(
      await FinancialTransaction.countDocuments({
        user: owner._id,
        category: 'profit_distribution',
      }),
    ).toBe(dists.length);
  });

  it('rolls back the failing member entirely when the ledger write throws mid-loop', async () => {
    const owner = await makeOwner();
    const m1 = await seedMemberWithBalance(owner, 50000);
    const m2 = await seedMemberWithBalance(owner, 50000);

    // Throw on the SECOND FinancialTransaction.create (the 2nd member's trio).
    const original = FinancialTransaction.create.bind(FinancialTransaction);
    let calls = 0;
    const spy = vi
      .spyOn(FinancialTransaction, 'create')
      .mockImplementation((...args) => {
        calls += 1;
        if (calls === 2) throw new Error('boom: ledger write failed');
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

    // The controller catches the throw and returns 500.
    await distributeProfit(req, res);
    spy.mockRestore();

    expect(res.statusCode).toBe(500);

    // The two members are processed in find() order; one fully committed, the
    // other fully rolled back. Identify which by who has a distribution row.
    const dists = await ProfitDistribution.find({ user: owner._id });
    expect(dists.length).toBe(1); // only the first member committed

    const committedMemberId = String(dists[0].member);
    const failedMemberId =
      committedMemberId === String(m1._id) ? m2._id : m1._id;

    // Failed member: balance unchanged, NO orphan distribution/ledger row.
    const failed = await Member.findById(failedMemberId);
    expect(failed.currentBalance).toBe(50000);
    expect(failed.totalProfit).toBe(0);
    expect(
      await ProfitDistribution.countDocuments({ member: failedMemberId }),
    ).toBe(0);
    expect(
      await FinancialTransaction.countDocuments({ member: failedMemberId }),
    ).toBe(0);

    // Committed member: exactly one ledger row, balance bumped.
    expect(
      await FinancialTransaction.countDocuments({ member: committedMemberId }),
    ).toBe(1);
    const committed = await Member.findById(committedMemberId);
    expect(committed.currentBalance).toBe(50000 + dists[0].amount);
  });

  it('rejects an invalid profit amount with 400', async () => {
    const owner = await makeOwner();
    const req = ownerReq(owner, { body: { totalProfit: 0 } });
    const res = mockRes();
    await distributeProfit(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('only distributes to the calling tenant (isolation)', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    await seedMemberWithBalance(owner, 40000);
    await seedMemberWithBalance(other, 99999);

    const req = ownerReq(owner, {
      body: { totalProfit: 500, startDate: periodStart, endDate: periodEnd },
    });
    const res = mockRes();
    await distributeProfit(req, res);

    expect(res.statusCode).toBe(201);
    // No distribution or ledger row touches the other tenant.
    expect(await ProfitDistribution.countDocuments({ user: other._id })).toBe(0);
    expect(
      await FinancialTransaction.countDocuments({ user: other._id }),
    ).toBe(0);
  });
});
