/**
 * Member creation is gated on the tenant having a branch, and new members are
 * attributed to the default branch. Covers admin createMember and public
 * selfRegister.
 */
const Member = require('../../src/models/Member');
const memberController = require('../../src/controllers/memberController');
const { makeOwner, makeBranch } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const createReq = (owner, body) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin', branchId: undefined },
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
});

const selfReq = (body) => ({
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

describe('createMember — branch gating + default attribution', () => {
  it('refuses to create a member when the tenant has no branch', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await memberController.createMember(
      createReq(owner, { name: 'A', email: 'a@test.com', phone: '03001112233', cnic: '3520200000001' }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('NO_BRANCH');
    expect(await Member.countDocuments({ user: owner._id })).toBe(0);
  });

  it('attributes a new member to the default branch when none is chosen', async () => {
    const owner = await makeOwner();
    const branch = await makeBranch(owner); // fallback default
    const res = mockRes();
    await memberController.createMember(
      createReq(owner, { name: 'B', email: 'b@test.com', phone: '03001112244', cnic: '3520200000002' }),
      res,
    );
    expect(res.statusCode).toBe(201);
    const member = await Member.findOne({ user: owner._id });
    expect(String(member.branchId)).toBe(String(branch._id));
  });

  it('honours an explicitly chosen branch over the default', async () => {
    const owner = await makeOwner();
    await makeBranch(owner, { name: 'Default', isDefault: true });
    const chosen = await makeBranch(owner, { name: 'Chosen' });
    const res = mockRes();
    await memberController.createMember(
      createReq(owner, {
        name: 'C', email: 'c@test.com', phone: '03001112255', cnic: '3520200000003',
        branchId: String(chosen._id),
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    const member = await Member.findOne({ user: owner._id });
    expect(String(member.branchId)).toBe(String(chosen._id));
  });
});

describe('selfRegister — branch gating + default attribution', () => {
  it('refuses registration when the business has no branch', async () => {
    const owner = await makeOwner({ securityCode: 'SHOP01' });
    const res = mockRes();
    await memberController.selfRegister(
      selfReq({ name: 'X', phone: '03009998877', cnic: '3520200000010', password: 'password123', securityCode: 'SHOP01' }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('NO_BRANCH');
    expect(await Member.countDocuments({ user: owner._id })).toBe(0);
  });

  it('creates a pending member on the default branch when a branch exists', async () => {
    const owner = await makeOwner({ securityCode: 'SHOP02' });
    const branch = await makeBranch(owner);
    const res = mockRes();
    await memberController.selfRegister(
      selfReq({ name: 'Y', email: 'y@test.com', phone: '03009998866', cnic: '3520200000011', password: 'password123', securityCode: 'SHOP02' }),
      res,
    );
    expect(res.statusCode).toBe(201);
    const member = await Member.findOne({ user: owner._id });
    expect(member.approvalStatus).toBe('pending');
    expect(member.isActive).toBe(false);
    expect(String(member.branchId)).toBe(String(branch._id));
  });
});
