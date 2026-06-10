/**
 * Loans must be attributed to a branch — a tenant cannot issue loans until they
 * have created at least one branch, and a new loan lands on the resolved branch
 * (customer/member branch, else the tenant default).
 */
const Loan = require('../../src/models/Loan');
const loanController = require('../../src/controllers/loanController');
const { makeOwner, makeBranch, makeCustomer } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const createReq = (owner, body) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin', branchId: undefined, name: 'Admin' },
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
});

const loanBody = (customer) => ({
  customerId: String(customer._id),
  principal: 100000,
  rate: 24,
  duration: 12,
  interestType: 'simple',
  startDate: new Date().toISOString(),
});

describe('createLoan — branch gating', () => {
  it('refuses to issue a loan when the tenant has no branch', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner, { currentAccountNumber: 'CUR-1' });
    const res = mockRes();
    await loanController.createLoan(createReq(owner, loanBody(customer)), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('NO_BRANCH');
    expect(await Loan.countDocuments({ user: owner._id })).toBe(0);
  });

  it('attributes a new loan to the default branch', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const customer = await makeCustomer(owner, { currentAccountNumber: 'CUR-2' });
    const res = mockRes();
    await loanController.createLoan(createReq(owner, loanBody(customer)), res);

    expect(res.statusCode).toBe(201);
    const loan = await Loan.findOne({ user: owner._id });
    expect(String(loan.branchId)).toBe(String(branch._id));
  });

  it('keeps the customer’s own branch when it has one', async () => {
    const owner = await makeOwner();
    const def = await makeBranch(owner, { name: 'Default', isDefault: true });
    const other = await makeBranch(owner, { name: 'Other' });
    const customer = await makeCustomer(owner, {
      currentAccountNumber: 'CUR-3',
      branchId: other._id,
    });
    const res = mockRes();
    await loanController.createLoan(createReq(owner, loanBody(customer)), res);

    expect(res.statusCode).toBe(201);
    const loan = await Loan.findOne({ user: owner._id });
    expect(String(loan.branchId)).toBe(String(other._id)); // not the default
    expect(String(loan.branchId)).not.toBe(String(def._id));
  });
});
