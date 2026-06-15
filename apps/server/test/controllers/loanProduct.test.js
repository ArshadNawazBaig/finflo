/**
 * loanProductController — tenant-scoped lending-product config. Previously
 * uncovered. Covers create + validation, tenant-scoped listing, the member
 * portal's active-only filter, cross-tenant 404s on update/delete, and a
 * regression guard for the documented whitelist bug where wrong field names made
 * rate/duration edits silently no-op (letting mispriced terms reach new loans).
 */
const LoanProduct = require('../../src/models/LoanProduct');
const {
  getLoanProducts,
  createLoanProduct,
  updateLoanProduct,
  deleteLoanProduct,
  getMemberLoanProducts,
} = require('../../src/controllers/loanProductController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, memberReq, mockRes } = require('../helpers/mocks');

const seedProduct = (owner, overrides = {}) =>
  LoanProduct.create({
    user: owner._id,
    name: 'Product',
    interestRate: 10,
    duration: 6,
    ...overrides,
  });

describe('createLoanProduct', () => {
  it('creates a product scoped to the owner', async () => {
    const owner = await makeOwner();
    const res = mockRes();

    await createLoanProduct(
      ownerReq(owner, {
        body: { name: 'Microloan', interestRate: 24, duration: 12 },
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Microloan');
    expect(String(res.body.user)).toBe(String(owner._id));
  });

  it('returns 400 when a required field is missing', async () => {
    const owner = await makeOwner();
    const res = mockRes();

    await createLoanProduct(
      ownerReq(owner, { body: { interestRate: 24, duration: 12 } }), // no name
      res,
    );

    expect(res.statusCode).toBe(400);
  });
});

describe('getLoanProducts — tenant scoping', () => {
  it('returns only the calling owner’s products', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    await seedProduct(ownerA, { name: 'A' });
    await seedProduct(ownerB, { name: 'B' });
    const res = mockRes();

    await getLoanProducts(ownerReq(ownerA), res);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('A');
  });
});

describe('updateLoanProduct', () => {
  it('persists rate/duration edits (regression: whitelist field names must match the schema)', async () => {
    const owner = await makeOwner();
    const p = await seedProduct(owner, { interestRate: 10, duration: 6 });
    const res = mockRes();

    await updateLoanProduct(
      ownerReq(owner, {
        params: { id: String(p._id) },
        body: { interestRate: 18, duration: 24 },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const fresh = await LoanProduct.findById(p._id);
    expect(fresh.interestRate).toBe(18); // not a silent no-op
    expect(fresh.duration).toBe(24);
  });

  it('cannot reassign tenant ownership via the body', async () => {
    const owner = await makeOwner();
    const otherOwner = await makeOwner();
    const p = await seedProduct(owner);
    const res = mockRes();

    await updateLoanProduct(
      ownerReq(owner, {
        params: { id: String(p._id) },
        body: { name: 'Renamed', user: String(otherOwner._id) },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(String((await LoanProduct.findById(p._id)).user)).toBe(String(owner._id));
  });

  it('tenant isolation: owner B updating owner A’s product → 404, unchanged', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const p = await seedProduct(ownerA, { interestRate: 10 });
    const res = mockRes();

    await updateLoanProduct(
      ownerReq(ownerB, {
        params: { id: String(p._id) },
        body: { interestRate: 99 },
      }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect((await LoanProduct.findById(p._id)).interestRate).toBe(10);
  });
});

describe('deleteLoanProduct — tenant isolation', () => {
  it('owner B deleting owner A’s product → 404, still exists', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const p = await seedProduct(ownerA);
    const res = mockRes();

    await deleteLoanProduct(
      ownerReq(ownerB, { params: { id: String(p._id) } }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect(await LoanProduct.findById(p._id)).toBeTruthy();
  });
});

describe('getMemberLoanProducts', () => {
  it('returns only active products for the member’s owning business', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await seedProduct(owner, { name: 'Active', isActive: true });
    await seedProduct(owner, { name: 'Inactive', isActive: false });
    const res = mockRes();

    await getMemberLoanProducts(memberReq(member, owner), res);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Active');
  });
});
