/**
 * branchController default-branch lifecycle — the first branch auto-defaults,
 * setDefaultBranch moves the flag (exactly one default per tenant), and deleting
 * the default promotes the oldest remaining branch.
 */
const Branch = require('../../src/models/Branch');
const branchController = require('../../src/controllers/branchController');
const { makeOwner, makeBranch } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

// createBranch reads req.user._id directly and enforces plan limits; use a Pro
// owner so multiple branches are allowed.
const adminReq = (owner, body = {}) => ({
  user: { _id: owner._id, role: 'admin' },
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
});

describe('createBranch — first branch becomes default', () => {
  it('flags the first branch isDefault and leaves the second un-flagged', async () => {
    const owner = await makeOwner({ plan: 'Pro' });

    const res1 = mockRes();
    await branchController.createBranch(
      adminReq(owner, { name: 'HQ', address: 'x', contactNumber: '0300' }),
      res1,
    );
    expect(res1.statusCode).toBe(201);
    expect(res1.body.isDefault).toBe(true);

    const res2 = mockRes();
    await branchController.createBranch(
      adminReq(owner, { name: 'Annex', address: 'y', contactNumber: '0301' }),
      res2,
    );
    expect(res2.statusCode).toBe(201);
    expect(res2.body.isDefault).toBe(false);
  });
});

describe('setDefaultBranch', () => {
  it('moves the default flag and keeps exactly one default', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    const a = await makeBranch(owner, { name: 'A', isDefault: true });
    const b = await makeBranch(owner, { name: 'B' });

    const res = mockRes();
    await branchController.setDefaultBranch(
      { user: { _id: owner._id, role: 'admin' }, params: { id: String(b._id) }, ip: '127.0.0.1', get: () => 't', headers: {} },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect((await Branch.findById(b._id)).isDefault).toBe(true);
    expect((await Branch.findById(a._id)).isDefault).toBe(false);
    expect(await Branch.countDocuments({ owner: owner._id, isDefault: true })).toBe(1);
  });

  it('refuses a staff (manager) caller', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner);
    const res = mockRes();
    await branchController.setDefaultBranch(
      { user: { _id: owner._id, role: 'staff' }, params: { id: String(branch._id) } },
      res,
    );
    expect(res.statusCode).toBe(403);
  });
});

describe('deleteBranch — promotes a new default', () => {
  it('promotes the oldest remaining branch when the default is deleted', async () => {
    const owner = await makeOwner({ plan: 'Pro' });
    const def = await makeBranch(owner, { name: 'Default', isDefault: true });
    const older = await makeBranch(owner, { name: 'Older' });

    const res = mockRes();
    await branchController.deleteBranch(
      { user: { _id: owner._id, role: 'admin', isManager: false }, params: { id: String(def._id) }, ip: '127.0.0.1', get: () => 't', headers: {} },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect((await Branch.findById(older._id)).isDefault).toBe(true);
    expect(await Branch.countDocuments({ owner: owner._id, isDefault: true })).toBe(1);
  });
});
