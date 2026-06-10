/**
 * loanController.approveLoan — the disbursement flow: a pending loan becomes
 * active, the principal is booked to the ledger, and (for member borrowers) the
 * wallet is credited with proceeds tracked apart from capital. Also guards
 * against re-approving an already-active loan (no double disbursement).
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const loanController = require('../../src/controllers/loanController');
const { makeOwner, makeBranch, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');
const mongoose = require('mongoose');

const approveReq = (owner, loanId, body = {}) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin', branchId: undefined, name: 'Admin' },
  params: { id: String(loanId) },
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

// A pending loan whose borrower is a member (wallet-linked customer).
const setupMemberLoan = async (overrides = {}) => {
  const owner = await makeOwner();
  const branch = await makeBranch(owner);
  const member = await makeMember(owner, {
    branchId: branch._id, currentBalance: 0, totalInvested: 0, totalLoanProceeds: 0,
  });
  const customer = await makeCustomer(owner, {
    isMember: true, memberId: member._id, branchId: branch._id,
  });
  const loan = await makeLoan(owner, customer, {
    status: 'pending', branchId: branch._id, principal: 50000,
    totalAmount: 60000, remainingAmount: 60000, outstandingPrincipal: 50000, rate: 24,
    ...overrides,
  });
  return { owner, branch, member, customer, loan };
};

describe('approveLoan', () => {
  it('404s for a missing loan / wrong tenant', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await loanController.approveLoan(approveReq(owner, new mongoose.Types.ObjectId()), res);
    expect(res.statusCode).toBe(404);
  });

  it('400s when the loan is not pending', async () => {
    const { owner, loan } = await setupMemberLoan({ status: 'active' });
    const res = mockRes();
    await loanController.approveLoan(approveReq(owner, loan._id), res);
    expect(res.statusCode).toBe(400);
  });

  it('activates the loan and credits the member wallet with tracked proceeds', async () => {
    const { owner, branch, member, loan } = await setupMemberLoan();
    const res = mockRes();
    await loanController.approveLoan(approveReq(owner, loan._id), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('active');

    const freshMember = await Member.findById(member._id);
    expect(freshMember.currentBalance).toBe(50000);
    expect(freshMember.totalLoanProceeds).toBe(50000); // proceeds, not capital
    expect(freshMember.totalInvested).toBe(0);

    const disb = await Investment.find({ member: member._id, type: 'loan_disbursement' });
    expect(disb).toHaveLength(1);
    expect(disb[0].amount).toBe(50000);
    expect(String(disb[0].branchId)).toBe(String(branch._id));

    const ft = await FinancialTransaction.find({ loan: loan._id, category: 'loan_disbursement' });
    expect(ft).toHaveLength(1);
    expect(ft[0].amount).toBe(50000);
  });

  it('does not disburse twice when approve is called again', async () => {
    const { owner, member, loan } = await setupMemberLoan();

    await loanController.approveLoan(approveReq(owner, loan._id), mockRes());
    const second = mockRes();
    await loanController.approveLoan(approveReq(owner, loan._id), second); // replay

    expect(second.statusCode).toBe(400); // no longer pending
    const freshMember = await Member.findById(member._id);
    expect(freshMember.currentBalance).toBe(50000); // credited once, not 100000
    expect(await Investment.countDocuments({ member: member._id, type: 'loan_disbursement' })).toBe(1);
  });
});
