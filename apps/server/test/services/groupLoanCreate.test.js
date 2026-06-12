/**
 * Group-loan creation: one sub-loan per member (per-member amounts), tenant
 * isolation, and the "one active loan per customer" guard.
 */
const Loan = require('../../src/models/Loan');
const GroupLoan = require('../../src/models/GroupLoan');
const groupLoanController = require('../../src/controllers/groupLoanController');
const { makeOwner, makeCustomer, makeGroup, makeLoan } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

describe('createGroupLoan', () => {
  it('creates one pending sub-loan per member with per-member amounts', async () => {
    const owner = await makeOwner();
    const custA = await makeCustomer(owner, { name: 'alpha' });
    const custB = await makeCustomer(owner, { name: 'beta' });
    const group = await makeGroup(owner, [custA, custB]);

    const req = ownerReq(owner, {
      params: { id: group._id.toString() },
      body: {
        rate: 24,
        duration: 12,
        interestType: 'simple',
        allocations: [
          { customer: custA._id, principal: 50000 },
          { customer: custB._id, principal: 30000 },
        ],
      },
    });
    const res = mockRes();
    await groupLoanController.createGroupLoan(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.allocations).toHaveLength(2);
    expect(res.body.status).toBe('pending');
    expect(res.body.totalPrincipal).toBe(80000);

    // Two individual sub-loans exist, both pending and tagged to the cycle.
    const subLoans = await Loan.find({ groupLoan: res.body._id }).sort({ principal: -1 });
    expect(subLoans).toHaveLength(2);
    expect(subLoans.map((l) => l.principal)).toEqual([50000, 30000]);
    expect(subLoans.every((l) => l.status === 'pending')).toBe(true);
    expect(subLoans.every((l) => String(l.loanGroup) === String(group._id))).toBe(true);
    // Each sub-loan is graded (so it shows a real grade in the dashboard risk
    // chart, not "Grade N/A").
    expect(subLoans.every((l) => !!l.riskDetails?.grade)).toBe(true);

    // The group-loan cycle persisted.
    const reloadedGroupLoan = await GroupLoan.findById(res.body._id);
    expect(reloadedGroupLoan).toBeTruthy();
  });

  it('returns 404 when the group belongs to another tenant', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    const custA = await makeCustomer(ownerA, { name: 'alpha' });
    const group = await makeGroup(ownerA, [custA]);

    const req = ownerReq(ownerB, {
      params: { id: group._id.toString() },
      body: {
        rate: 24,
        duration: 12,
        allocations: [{ customer: custA._id, principal: 50000 }],
      },
    });
    const res = mockRes();
    await groupLoanController.createGroupLoan(req, res);

    expect(res.statusCode).toBe(404);
    expect(await GroupLoan.countDocuments({})).toBe(0);
  });

  it('rejects a member who already has an active loan (400)', async () => {
    const owner = await makeOwner();
    const custA = await makeCustomer(owner, { name: 'alpha' });
    await makeLoan(owner, custA, { status: 'active' });
    const group = await makeGroup(owner, [custA]);

    const req = ownerReq(owner, {
      params: { id: group._id.toString() },
      body: {
        rate: 24,
        duration: 12,
        allocations: [{ customer: custA._id, principal: 50000 }],
      },
    });
    const res = mockRes();
    await groupLoanController.createGroupLoan(req, res);

    expect(res.statusCode).toBe(400);
    // No group-loan and no NEW sub-loan got created (the pre-existing one stays).
    expect(await GroupLoan.countDocuments({})).toBe(0);
    expect(await Loan.countDocuments({ groupLoan: { $ne: null } })).toBe(0);
  });

  it('rejects a customer that is not a member of the group (400)', async () => {
    const owner = await makeOwner();
    const inGroup = await makeCustomer(owner, { name: 'alpha' });
    const outsider = await makeCustomer(owner, { name: 'outsider' });
    const group = await makeGroup(owner, [inGroup]);

    const req = ownerReq(owner, {
      params: { id: group._id.toString() },
      body: {
        rate: 24,
        duration: 12,
        allocations: [{ customer: outsider._id, principal: 50000 }],
      },
    });
    const res = mockRes();
    await groupLoanController.createGroupLoan(req, res);

    expect(res.statusCode).toBe(400);
  });
});
