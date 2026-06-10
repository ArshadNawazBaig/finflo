/**
 * customerController — create (validation + branch requirement), ownership-scoped
 * read and delete.
 */
const Customer = require('../../src/models/Customer');
const cc = require('../../src/controllers/customerController');
const { makeOwner, makeBranch, makeCustomer } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');
const mongoose = require('mongoose');

const adminReq = (owner, over = {}) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin', name: 'Admin' },
  body: {},
  params: {},
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  ...over,
});

const validBody = (branch) => ({
  name: 'John Smith',
  email: 'john@test.com',
  phone: '03001234567',
  cnic: '35202-1234567-3',
  signature: 'signature-data',
  branchId: String(branch._id),
});

describe('createCustomer', () => {
  it('400s without a branch selection', async () => {
    const owner = await makeOwner({ customerCount: 0 });
    const { branchId, ...noBranch } = validBody({ _id: 'x' });
    const res = mockRes();
    await cc.createCustomer(adminReq(owner, { body: noBranch }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/branch/i);
  });

  it('400s on an invalid CNIC format', async () => {
    const owner = await makeOwner({ customerCount: 0 });
    const branch = await makeBranch(owner);
    const res = mockRes();
    await cc.createCustomer(adminReq(owner, { body: { ...validBody(branch), cnic: '123' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cnic/i);
  });

  it('400s without a signature', async () => {
    const owner = await makeOwner({ customerCount: 0 });
    const branch = await makeBranch(owner);
    const { signature, ...noSig } = validBody(branch);
    const res = mockRes();
    await cc.createCustomer(adminReq(owner, { body: noSig }), res);
    expect(res.statusCode).toBe(400);
  });

  it('creates a customer with valid input', async () => {
    const owner = await makeOwner({ customerCount: 0 });
    const branch = await makeBranch(owner);
    const res = mockRes();
    await cc.createCustomer(adminReq(owner, { body: validBody(branch) }), res);

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('john smith'); // lowercased
    expect(String(res.body.branchId)).toBe(String(branch._id));
    expect(await Customer.countDocuments({ user: owner._id })).toBe(1);
  });
});

describe('getCustomerById', () => {
  it('returns an owned customer', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const res = mockRes();
    await cc.getCustomerById(adminReq(owner, { params: { id: String(customer._id) } }), res);
    expect(res.statusCode).toBe(200);
  });

  it('401s for another tenant’s customer', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const customer = await makeCustomer(owner);
    const res = mockRes();
    await cc.getCustomerById(adminReq(other, { params: { id: String(customer._id) } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('404s for a missing customer', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await cc.getCustomerById(adminReq(owner, { params: { id: String(new mongoose.Types.ObjectId()) } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('deleteCustomer', () => {
  it('deletes an owned customer', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const res = mockRes();
    await cc.deleteCustomer(adminReq(owner, { params: { id: String(customer._id) } }), res);
    expect(res.statusCode).toBe(200);
    expect(await Customer.countDocuments({ _id: customer._id })).toBe(0);
  });

  it('401s when deleting another tenant’s customer', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const customer = await makeCustomer(owner);
    const res = mockRes();
    await cc.deleteCustomer(adminReq(other, { params: { id: String(customer._id) } }), res);
    expect(res.statusCode).toBe(401);
    expect(await Customer.countDocuments({ _id: customer._id })).toBe(1); // not deleted
  });
});
