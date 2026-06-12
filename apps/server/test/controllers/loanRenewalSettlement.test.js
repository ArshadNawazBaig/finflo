/**
 * applyRenewalSettlement (exercised via renewLoan's top-up path) — closes the old
 * loan, books the top-up disbursement ledger row, credits the member's wallet and
 * writes an Investment row, all in ONE transaction. Asserts the money moves on the
 * happy path and that a mid-operation failure rolls EVERYTHING back: the old loan
 * stays open and no orphan disbursement / wallet credit / investment survives.
 */
const Loan = require('../../src/models/Loan');
const Member = require('../../src/models/Member');
const Customer = require('../../src/models/Customer');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { renewLoan } = require('../../src/controllers/loanController');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeLoan,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

// Build a member-owned loan with an outstanding balance, ready for a top-up.
const seedMemberLoan = async (owner, outstanding = 40000) => {
  const member = await makeMember(owner, { currentBalance: 0, totalInvested: 0 });
  const customer = await makeCustomer(owner, {
    isMember: true,
    memberId: member._id,
  });
  const loan = await makeLoan(owner, customer, {
    principal: 50000,
    totalAmount: 60000,
    remainingAmount: outstanding,
    status: 'active',
  });
  return { member, customer, loan };
};

describe('applyRenewalSettlement (via renewLoan top-up)', () => {
  it('closes the old loan and disburses only the extra cash on a top-up', async () => {
    const owner = await makeOwner();
    const { member, loan } = await seedMemberLoan(owner, 40000);

    const req = ownerReq(owner, {
      params: { id: String(loan._id) },
      body: {
        renewalType: 'topup',
        principal: 100000, // extra cash = 100000 - 40000 = 60000
        rate: 24,
        duration: 12,
      },
    });
    const res = mockRes();
    await renewLoan(req, res);

    expect(res.statusCode).toBe(201);

    // Old loan closed.
    const oldFresh = await Loan.findById(loan._id);
    expect(oldFresh.status).toBe('renewed');
    expect(oldFresh.remainingAmount).toBe(0);
    expect(String(oldFresh.renewedTo)).toBe(String(res.body._id));

    // Member wallet credited by the extra cash only.
    const freshMember = await Member.findById(member._id);
    expect(freshMember.currentBalance).toBe(60000);
    expect(freshMember.totalInvested).toBe(60000);

    // One disbursement ledger row + one Investment row, both for 60000.
    const tx = await FinancialTransaction.findOne({
      user: owner._id,
      category: 'loan_disbursement',
    });
    expect(tx.amount).toBe(60000);
    const inv = await Investment.findOne({ member: member._id, type: 'deposit' });
    expect(inv.amount).toBe(60000);
    expect(inv.balanceAfter).toBe(60000);
  });

  it('rolls back everything when the Investment write throws mid-settlement', async () => {
    const owner = await makeOwner();
    const { member, loan } = await seedMemberLoan(owner, 40000);

    const spy = vi
      .spyOn(Investment, 'create')
      .mockImplementation(() => {
        throw new Error('boom: investment write failed');
      });

    const req = ownerReq(owner, {
      params: { id: String(loan._id) },
      body: { renewalType: 'topup', principal: 100000, rate: 24, duration: 12 },
    });
    const res = mockRes();
    await renewLoan(req, res);
    spy.mockRestore();

    // The throw bubbles to renewLoan's catch → 400.
    expect(res.statusCode).toBe(400);

    // Old loan still OPEN — the close was rolled back with the rest.
    const oldFresh = await Loan.findById(loan._id);
    expect(oldFresh.status).toBe('active');
    expect(oldFresh.remainingAmount).toBe(40000);
    expect(oldFresh.renewedTo).toBeFalsy();

    // No wallet credit, no orphan disbursement / investment row.
    const freshMember = await Member.findById(member._id);
    expect(freshMember.currentBalance).toBe(0);
    expect(freshMember.totalInvested).toBe(0);
    expect(
      await FinancialTransaction.countDocuments({
        user: owner._id,
        category: 'loan_disbursement',
      }),
    ).toBe(0);
    expect(
      await Investment.countDocuments({ member: member._id, type: 'deposit' }),
    ).toBe(0);
  });

  it('returns 404 for a loan owned by another tenant (isolation)', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const { loan } = await seedMemberLoan(other, 40000);

    const req = ownerReq(owner, {
      params: { id: String(loan._id) },
      body: { renewalType: 'topup', principal: 100000, rate: 24, duration: 12 },
    });
    const res = mockRes();
    await renewLoan(req, res);

    expect(res.statusCode).toBe(404);
  });
});
