/**
 * memberController.updateMember — reassigning a member to a different branch
 * must cascade the new branchId onto every record that drives per-branch
 * analytics (the linked customer, the member's loans, financial transactions
 * and investments). Without the cascade those rows keep crediting the old (or a
 * since-deleted) branch and the new branch's Cross-Branch Comparison reads 0.
 */
const Member = require('../../src/models/Member');
const Customer = require('../../src/models/Customer');
const Loan = require('../../src/models/Loan');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { updateMember } = require('../../src/controllers/memberController');
const { makeOwner, makeBranch, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const adminReq = (owner, id, body) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin' },
  params: { id: String(id) },
  body,
});

describe('updateMember branch reassignment cascade', () => {
  it('moves the customer, loans, transactions and investments to the new branch', async () => {
    const owner = await makeOwner();
    const branchA = await makeBranch(owner, { isDefault: true });
    const branchB = await makeBranch(owner);

    const customer = await makeCustomer(owner, { branchId: branchA._id });
    const member = await makeMember(owner, { branchId: branchA._id, customer: customer._id });
    const loan = await makeLoan(owner, customer, { branchId: branchA._id, member: member._id });
    const ft = await FinancialTransaction.create({
      user: owner._id, member: member._id, branchId: branchA._id,
      type: 'income', category: 'late_fee', amount: 100, date: new Date(),
    });
    const inv = await Investment.create({
      user: owner._id, member: member._id, branchId: branchA._id,
      type: 'deposit', accountType: 'current', amount: 5000,
    });

    const res = mockRes();
    await updateMember(adminReq(owner, member._id, { branchId: String(branchB._id) }), res);
    expect(res.statusCode).toBe(200);

    const bId = String(branchB._id);
    expect(String((await Member.findById(member._id)).branchId)).toBe(bId);
    expect(String((await Customer.findById(customer._id)).branchId)).toBe(bId);
    expect(String((await Loan.findById(loan._id)).branchId)).toBe(bId);
    expect(String((await FinancialTransaction.findById(ft._id)).branchId)).toBe(bId);
    expect(String((await Investment.findById(inv._id)).branchId)).toBe(bId);
  });

  it('re-homes a loan orphaned on a deleted branch (self-heal on re-save)', async () => {
    const owner = await makeOwner();
    const liveBranch = await makeBranch(owner, { isDefault: true });
    const deletedBranchId = String((await makeBranch(owner))._id); // simulate a now-deleted branch id

    const customer = await makeCustomer(owner, { branchId: deletedBranchId });
    const member = await makeMember(owner, { branchId: liveBranch._id, customer: customer._id });
    // Loan still dangling on the deleted branch even though the member moved.
    const loan = await makeLoan(owner, customer, { branchId: deletedBranchId });

    const res = mockRes();
    // Re-assigning the member to their current live branch should pull the loan over.
    await updateMember(adminReq(owner, member._id, { branchId: String(liveBranch._id) }), res);

    expect(String((await Loan.findById(loan._id)).branchId)).toBe(String(liveBranch._id));
  });

  it('does not touch branch attribution when no branchId is supplied', async () => {
    const owner = await makeOwner();
    const branchA = await makeBranch(owner, { isDefault: true });
    const customer = await makeCustomer(owner, { branchId: branchA._id });
    const member = await makeMember(owner, { branchId: branchA._id, customer: customer._id });
    const loan = await makeLoan(owner, customer, { branchId: branchA._id });

    const res = mockRes();
    await updateMember(adminReq(owner, member._id, { name: 'New Name' }), res);

    expect(String((await Loan.findById(loan._id)).branchId)).toBe(String(branchA._id));
    expect(String((await Member.findById(member._id)).branchId)).toBe(String(branchA._id));
  });
});
