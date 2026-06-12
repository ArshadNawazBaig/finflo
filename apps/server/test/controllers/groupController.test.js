/**
 * LoanGroup CRUD: create, paginated list shape, tenant isolation (other owner →
 * 404), and the delete guard for groups with active loan cycles.
 */
const groupController = require('../../src/controllers/groupController');
const groupLoanService = require('../../src/services/groupLoanService');
const { makeOwner, makeCustomer, makeGroup } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

describe('groupController', () => {
  it('creates a group with members', async () => {
    const owner = await makeOwner();
    const custA = await makeCustomer(owner, { name: 'alpha' });
    const custB = await makeCustomer(owner, { name: 'beta' });

    const req = ownerReq(owner, {
      body: {
        name: 'Saddar Group',
        members: [
          { customer: custA._id, role: 'leader' },
          { customer: custB._id },
        ],
      },
    });
    const res = mockRes();
    await groupController.createGroup(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Saddar Group');
    expect(res.body.members).toHaveLength(2);
    expect(res.body.status).toBe('forming');
  });

  it('rejects a group with no members (400)', async () => {
    const owner = await makeOwner();
    const req = ownerReq(owner, { body: { name: 'Empty', members: [] } });
    const res = mockRes();
    await groupController.createGroup(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('lists groups with the standard pagination shape, scoped to the tenant', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const custA = await makeCustomer(ownerA, { name: 'alpha' });
    await makeGroup(ownerA, [custA]);
    const custB = await makeCustomer(ownerB, { name: 'beta' });
    await makeGroup(ownerB, [custB]);

    const req = ownerReq(ownerA, { query: {} });
    const res = mockRes();
    await groupController.getGroups(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('totalEntries', 1);
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body).toHaveProperty('currentPage', 1);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 404 for another tenant\'s group', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const custA = await makeCustomer(ownerA, { name: 'alpha' });
    const group = await makeGroup(ownerA, [custA]);

    const req = ownerReq(ownerB, { params: { id: group._id.toString() } });
    const res = mockRes();
    await groupController.getGroupById(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('blocks deleting a group that has an active loan cycle (400)', async () => {
    const owner = await makeOwner();
    const custA = await makeCustomer(owner, { name: 'alpha' });
    const group = await makeGroup(owner, [custA]);
    await groupLoanService.createGroupLoan(ownerReq(owner), {
      groupId: group._id,
      rate: 24,
      duration: 12,
      allocations: [{ customer: custA._id, principal: 50000 }],
    });

    const req = ownerReq(owner, { params: { id: group._id.toString() } });
    const res = mockRes();
    await groupController.deleteGroup(req, res);
    expect(res.statusCode).toBe(400);
  });
});
