/**
 * loanController.createLoan — loan origination. An admin issues a loan to a
 * customer: it must be scoped to the owner, land in `pending`, and have its
 * computed terms (emi / totalAmount / remainingAmount / outstandingPrincipal)
 * derived from principal+rate+duration. Also guards required fields and tenant
 * isolation (a loan under owner A is invisible to owner B → 404).
 */
const Loan = require('../../src/models/Loan');
const loanController = require('../../src/controllers/loanController');
const { makeOwner, makeBranch, makeCustomer } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');
const mongoose = require('mongoose');

const createReq = (owner, body = {}) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin', branchId: undefined, name: 'Admin' },
  params: {},
  query: {},
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

const getReq = (owner, loanId) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin', branchId: undefined },
  params: { id: String(loanId) },
  query: {},
  body: {},
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

// A tenant with a branch and a customer that has a loan account number — the two
// hard prerequisites createLoan enforces before it will issue.
const setupTenant = async () => {
  const owner = await makeOwner({ plan: 'Free' });
  const branch = await makeBranch(owner);
  const customer = await makeCustomer(owner, {
    branchId: branch._id,
    loanAccountNumber: `LA-${Date.now()}`,
  });
  return { owner, branch, customer };
};

describe('createLoan', () => {
  it('creates a pending loan scoped to the owner with correct computed totals', async () => {
    const { owner, branch, customer } = await setupTenant();
    const res = mockRes();

    // simple interest: interest = P*r*d/1200 = 100000*24*12/1200 = 24000
    // totalAmount = 124000, emi = 124000/12 = 10333.33 → round 10333
    await loanController.createLoan(
      createReq(owner, {
        customerId: String(customer._id),
        principal: 100000,
        rate: 24,
        duration: 12,
        interestType: 'simple',
        startDate: new Date().toISOString(),
      }),
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(String(res.body.user)).toBe(String(owner._id));
    expect(res.body.status).toBe('pending');
    expect(res.body.principal).toBe(100000);
    expect(res.body.totalAmount).toBe(124000);
    expect(res.body.remainingAmount).toBe(124000); // mirrors totalAmount at issue
    expect(res.body.outstandingPrincipal).toBe(100000); // principal tracked apart from interest
    expect(res.body.emi).toBe(Math.round(124000 / 12));
    expect(String(res.body.branchId)).toBe(String(branch._id)); // attributed to customer's branch

    // persisted, owner-scoped
    const persisted = await Loan.findOne({ user: owner._id, customer: customer._id });
    expect(persisted).toBeTruthy();
    expect(persisted.status).toBe('pending');
  });

  it('404s when the customer belongs to another tenant', async () => {
    const { owner } = await setupTenant();
    const otherOwner = await makeOwner({ plan: 'Free' });
    const otherBranch = await makeBranch(otherOwner);
    const otherCustomer = await makeCustomer(otherOwner, {
      branchId: otherBranch._id,
      loanAccountNumber: `LA-${Date.now()}-x`,
    });

    const res = mockRes();
    await loanController.createLoan(
      createReq(owner, {
        customerId: String(otherCustomer._id),
        principal: 50000,
        rate: 12,
        duration: 6,
        startDate: new Date().toISOString(),
      }),
      res,
    );

    expect(res.statusCode).toBe(404); // unowned customer → not found, no leak
    expect(await Loan.countDocuments({ user: owner._id })).toBe(0);
  });

  it('400s when the tenant has no branch', async () => {
    const owner = await makeOwner({ plan: 'Free' });
    const customer = await makeCustomer(owner, { loanAccountNumber: `LA-${Date.now()}-nb` });

    const res = mockRes();
    await loanController.createLoan(
      createReq(owner, {
        customerId: String(customer._id),
        principal: 50000,
        rate: 12,
        duration: 6,
        startDate: new Date().toISOString(),
      }),
      res,
    );

    expect(res.statusCode).toBe(400); // NO_BRANCH
    expect(res.body.code).toBe('NO_BRANCH');
  });

  it('tenant isolation: a loan issued under owner A is not fetchable by owner B → 404', async () => {
    const { owner, customer } = await setupTenant();
    const create = mockRes();
    await loanController.createLoan(
      createReq(owner, {
        customerId: String(customer._id),
        principal: 80000,
        rate: 18,
        duration: 10,
        startDate: new Date().toISOString(),
      }),
      create,
    );
    expect(create.statusCode).toBe(201);
    const loanId = create.body._id;

    // Owner A sees it.
    const ownerView = mockRes();
    await loanController.getLoanById(getReq(owner, loanId), ownerView);
    expect(ownerView.statusCode).toBe(200);
    expect(String(ownerView.body._id)).toBe(String(loanId));

    // A different tenant does not.
    const otherOwner = await makeOwner({ plan: 'Free' });
    const otherView = mockRes();
    await loanController.getLoanById(getReq(otherOwner, loanId), otherView);
    expect(otherView.statusCode).toBe(404);
  });

  it('404s on getLoanById for a non-existent loan', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await loanController.getLoanById(getReq(owner, new mongoose.Types.ObjectId()), res);
    expect(res.statusCode).toBe(404);
  });
});
