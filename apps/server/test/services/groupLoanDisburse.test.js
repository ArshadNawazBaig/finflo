/**
 * Group-loan approval disburses every member sub-loan with the same ledger shape
 * as individual approval: one loan_disbursement row + a member wallet credit per
 * member, and the cycle goes active.
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const groupLoanService = require('../../src/services/groupLoanService');
const groupLoanController = require('../../src/controllers/groupLoanController');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeGroup,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

// A member-linked customer (so disbursement credits a wallet).
const makeMemberCustomer = async (owner, name) => {
  const member = await makeMember(owner, { currentBalance: 0 });
  const customer = await makeCustomer(owner, {
    name,
    isMember: true,
    memberId: member._id,
  });
  return { member, customer };
};

describe('approveGroupLoan — disbursement', () => {
  it('disburses each sub-loan and credits each member wallet', async () => {
    const owner = await makeOwner();
    const a = await makeMemberCustomer(owner, 'alpha');
    const b = await makeMemberCustomer(owner, 'beta');
    const group = await makeGroup(owner, [a.customer, b.customer]);

    const req = ownerReq(owner);
    const groupLoan = await groupLoanService.createGroupLoan(req, {
      groupId: group._id,
      rate: 24,
      duration: 12,
      interestType: 'simple',
      allocations: [
        { customer: a.customer._id, principal: 50000 },
        { customer: b.customer._id, principal: 30000 },
      ],
    });

    const approveReq = ownerReq(owner, {
      params: { groupLoanId: groupLoan._id.toString() },
    });
    const res = mockRes();
    await groupLoanController.approveGroupLoan(approveReq, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('active');

    // Both sub-loans active.
    const subLoans = await Loan.find({ groupLoan: groupLoan._id });
    expect(subLoans.every((l) => l.status === 'active')).toBe(true);

    // One disbursement ledger row per member.
    const disbursements = await FinancialTransaction.find({
      category: 'loan_disbursement',
      user: owner._id,
    });
    expect(disbursements).toHaveLength(2);

    // Each member wallet credited with their own principal.
    const memberA = await Member.findById(a.member._id);
    const memberB = await Member.findById(b.member._id);
    expect(memberA.currentBalance).toBe(50000);
    expect(memberB.currentBalance).toBe(30000);
    expect(memberA.totalLoanProceeds).toBe(50000);
  });
});
