/**
 * checkbookController — checkbook issuance charges a per-leaf fee against the
 * member's current account inside a transaction (ledger row + investment row),
 * and cancellation can refund it. Previously uncovered. Covers the happy-path
 * fee deduction + ledger shape, the insufficient-balance rollback, input
 * validation, tenant isolation, and the cancel/refund reversal.
 */
const Member = require('../../src/models/Member');
const Checkbook = require('../../src/models/Checkbook');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const {
  issueCheckbook,
  cancelCheckbook,
} = require('../../src/controllers/checkbookController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

// issueCheckbook writes inside a transaction. mongodb-memory-server throws a
// "catalog changes" error when a transaction is the first op to create a
// collection OR build its indexes (prod Atlas has them already). Create the
// collections and build their indexes up front so the file passes regardless of
// run order. createIndexes() conflicts are swallowed — the Checkbook schema
// double-declares the checkbookNumber index (unique field + schema.index), which
// autoIndex normally logs and ignores; we only need the index to exist.
beforeAll(async () => {
  for (const M of [Member, FinancialTransaction, Investment, Checkbook]) {
    await M.createCollection().catch(() => {});
    await M.createIndexes().catch(() => {});
  }
});

describe('issueCheckbook', () => {
  it('deducts the fee, issues the checkbook and writes the investment + ledger rows', async () => {
    const owner = await makeOwner({ checkbookFees: { 25: 500 } });
    const member = await makeMember(owner, { currentBalance: 2000 });
    const res = mockRes();

    await issueCheckbook(
      ownerReq(owner, { body: { memberId: String(member._id), numberOfLeaves: 25 } }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.newBalance).toBe(1500);

    const fresh = await Member.findById(member._id);
    expect(fresh.currentBalance).toBe(1500);

    const cb = await Checkbook.findOne({ member: member._id });
    expect(cb).toBeTruthy();
    expect(cb.fee).toBe(500);
    expect(cb.numberOfLeaves).toBe(25);
    expect(cb.status).toBe('active');

    const inv = await Investment.findOne({ member: member._id, type: 'withdrawal' });
    expect(inv.amount).toBe(500);
    expect(inv.balanceAfter).toBe(1500);

    const txn = await FinancialTransaction.findOne({ category: 'checkbook_fee' });
    expect(txn.amount).toBe(500);
    expect(txn.type).toBe('income');
    expect(String(txn.user)).toBe(String(owner._id));
  });

  it('rejects when the current account cannot cover the fee and books NOTHING', async () => {
    const owner = await makeOwner({ checkbookFees: { 25: 500 } });
    const member = await makeMember(owner, { currentBalance: 100 });
    const res = mockRes();

    await issueCheckbook(
      ownerReq(owner, { body: { memberId: String(member._id), numberOfLeaves: 25 } }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect((await Member.findById(member._id)).currentBalance).toBe(100); // unchanged
    expect(await Checkbook.countDocuments({ member: member._id })).toBe(0);
  });

  it('validates the request (missing memberId, invalid leaf count)', async () => {
    const owner = await makeOwner({ checkbookFees: { 25: 500 } });
    const member = await makeMember(owner, { currentBalance: 2000 });

    const r1 = mockRes();
    await issueCheckbook(ownerReq(owner, { body: { numberOfLeaves: 25 } }), r1);
    expect(r1.statusCode).toBe(400);

    const r2 = mockRes();
    await issueCheckbook(
      ownerReq(owner, { body: { memberId: String(member._id), numberOfLeaves: 30 } }),
      r2,
    );
    expect(r2.statusCode).toBe(400);
  });

  it('tenant isolation: owner B cannot issue against owner A’s member', async () => {
    const ownerA = await makeOwner({ checkbookFees: { 25: 500 } });
    const ownerB = await makeOwner({ checkbookFees: { 25: 500 } });
    const memberA = await makeMember(ownerA, { currentBalance: 2000 });
    const res = mockRes();

    await issueCheckbook(
      ownerReq(ownerB, { body: { memberId: String(memberA._id), numberOfLeaves: 25 } }),
      res,
    );

    // Member is scoped to ownerA → not found for ownerB; nothing is mutated.
    expect(await Checkbook.countDocuments({ member: memberA._id })).toBe(0);
    expect((await Member.findById(memberA._id)).currentBalance).toBe(2000);
  });
});

describe('cancelCheckbook', () => {
  const seedCheckbook = async (owner, member, overrides = {}) =>
    Checkbook.create({
      user: owner._id,
      member: member._id,
      checkbookNumber: `CB-${member._id.toString().slice(-5)}`,
      fee: 500,
      numberOfLeaves: 25,
      status: 'active',
      issuedBy: owner._id,
      ...overrides,
    });

  it('refunds the fee back to the current account when refund=true', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 1500 });
    const cb = await seedCheckbook(owner, member);
    const res = mockRes();

    await cancelCheckbook(
      ownerReq(owner, { params: { id: String(cb._id) }, body: { refund: true } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const freshCb = await Checkbook.findById(cb._id);
    expect(freshCb.status).toBe('cancelled');
    expect(freshCb.refunded).toBe(true);
    expect((await Member.findById(member._id)).currentBalance).toBe(2000); // refunded
  });

  it('tenant isolation: owner B cannot cancel owner A’s checkbook → 404, left active', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const member = await makeMember(ownerA, { currentBalance: 1500 });
    const cb = await seedCheckbook(ownerA, member);
    const res = mockRes();

    await cancelCheckbook(
      ownerReq(ownerB, { params: { id: String(cb._id) }, body: { refund: true } }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect((await Checkbook.findById(cb._id)).status).toBe('active'); // untouched
  });
});
