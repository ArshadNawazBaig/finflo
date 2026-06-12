/**
 * Staff branch isolation on the money-moving group-loan endpoints: a staff user
 * scoped to one branch must not approve or collect on a group loan that lives in
 * another branch of the same tenant (404, not the resource).
 */
const groupLoanService = require('../../src/services/groupLoanService');
const groupLoanController = require('../../src/controllers/groupLoanController');
const {
  makeOwner,
  makeBranch,
  makeCustomer,
  makeGroup,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const staffReq = (owner, branchId, overrides = {}) => ({
  user: {
    _id: owner._id,
    effectiveOwnerId: owner._id,
    role: 'staff',
    isSuperAdmin: false,
    branchId,
    managedBranchId: branchId,
  },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
  params: {},
  query: {},
  body: {},
  ...overrides,
});

describe('group-loan staff branch isolation', () => {
  it('hides a group loan in another branch from branch-scoped staff (404)', async () => {
    const owner = await makeOwner();
    const branchA = await makeBranch(owner);
    const branchB = await makeBranch(owner);
    const custA = await makeCustomer(owner, { name: 'alpha' });
    const group = await makeGroup(owner, [custA], { branchId: branchA._id });

    const groupLoan = await groupLoanService.createGroupLoan(ownerReq(owner), {
      groupId: group._id,
      rate: 24,
      duration: 12,
      allocations: [{ customer: custA._id, principal: 50000 }],
    });

    // Staff in branch B cannot see / approve the branch-A group loan.
    const req = staffReq(owner, branchB._id, {
      params: { groupLoanId: groupLoan._id.toString() },
    });
    const res = mockRes();
    await groupLoanController.getGroupLoanById(req, res);
    expect(res.statusCode).toBe(404);

    const approveRes = mockRes();
    await groupLoanController.approveGroupLoan(req, approveRes);
    expect(approveRes.statusCode).toBe(404);
  });

  it('lets staff in the owning branch act on the group loan', async () => {
    const owner = await makeOwner();
    const branchA = await makeBranch(owner);
    const custA = await makeCustomer(owner, { name: 'alpha' });
    const group = await makeGroup(owner, [custA], { branchId: branchA._id });

    const groupLoan = await groupLoanService.createGroupLoan(ownerReq(owner), {
      groupId: group._id,
      rate: 24,
      duration: 12,
      allocations: [{ customer: custA._id, principal: 50000 }],
    });

    const req = staffReq(owner, branchA._id, {
      params: { groupLoanId: groupLoan._id.toString() },
    });
    const res = mockRes();
    await groupLoanController.approveGroupLoan(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('active');
  });
});
