/**
 * Joint-liability cascade: when one member's sub-loan goes overdue, the whole
 * group is flagged at-risk and new group lending is frozen.
 */
const Loan = require('../../src/models/Loan');
const LoanGroup = require('../../src/models/LoanGroup');
const groupLoanService = require('../../src/services/groupLoanService');
const groupLoanController = require('../../src/controllers/groupLoanController');
const { makeOwner, makeCustomer, makeGroup } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const seedApproved = async (owner) => {
  const custA = await makeCustomer(owner, { name: 'alpha' });
  const custB = await makeCustomer(owner, { name: 'beta' });
  const group = await makeGroup(owner, [custA, custB]);
  const req = ownerReq(owner);
  const groupLoan = await groupLoanService.createGroupLoan(req, {
    groupId: group._id,
    rate: 24,
    duration: 12,
    allocations: [
      { customer: custA._id, principal: 50000 },
      { customer: custB._id, principal: 30000 },
    ],
  });
  await groupLoanService.approveGroupLoan(req, groupLoan._id);
  return { group, groupLoan };
};

describe('joint-liability cascade', () => {
  it('flags the group at-risk when a sub-loan goes overdue', async () => {
    const owner = await makeOwner();
    const { group, groupLoan } = await seedApproved(owner);

    // Simulate the overdue-downgrade cron touching one member's sub-loan.
    const subLoan = await Loan.findOne({ groupLoan: groupLoan._id });
    subLoan.status = 'overdue';
    await subLoan.save();

    await groupLoanService.cascadeGroupRisk(subLoan);

    const reloadedGroup = await LoanGroup.findById(group._id);
    expect(reloadedGroup.status).toBe('at_risk');

    const reloadedGroupLoan = await groupLoanService.recomputeGroupStatus(groupLoan._id);
    expect(reloadedGroupLoan.groupLoan.status).toBe('overdue');
  });

  it('blocks a new group loan while the group is at-risk (400)', async () => {
    const owner = await makeOwner();
    const { group, groupLoan } = await seedApproved(owner);

    const subLoan = await Loan.findOne({ groupLoan: groupLoan._id });
    subLoan.status = 'overdue';
    await subLoan.save();
    await groupLoanService.cascadeGroupRisk(subLoan);

    const memberCustomerId = group.members[0].customer;
    const req = ownerReq(owner, {
      params: { id: group._id.toString() },
      body: {
        rate: 24,
        duration: 12,
        allocations: [{ customer: memberCustomerId, principal: 10000 }],
      },
    });
    const res = mockRes();
    await groupLoanController.createGroupLoan(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/at-risk/i);
  });
});
