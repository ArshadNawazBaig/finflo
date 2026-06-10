/**
 * branchController.deleteBranch — deleting a branch must not orphan its data.
 * Members, customers, loans, transactions and investments are re-homed onto the
 * surviving default branch (or have branchId unset when no branch remains), and
 * the deleted branch's default flag is promoted to the oldest remaining branch.
 */
const Member = require('../../src/models/Member');
const Customer = require('../../src/models/Customer');
const Loan = require('../../src/models/Loan');
const Branch = require('../../src/models/Branch');
const Investment = require('../../src/models/Investment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { deleteBranch } = require('../../src/controllers/branchController');
const { makeOwner, makeBranch, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const adminReq = (owner, id) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin' },
  params: { id: String(id) },
});

const seedBranchData = async (owner, branch) => {
  const customer = await makeCustomer(owner, { branchId: branch._id });
  const member = await makeMember(owner, { branchId: branch._id, customer: customer._id });
  const loan = await makeLoan(owner, customer, { branchId: branch._id, member: member._id });
  const ft = await FinancialTransaction.create({
    user: owner._id, member: member._id, branchId: branch._id,
    type: 'income', category: 'late_fee', amount: 100, date: new Date(),
  });
  const inv = await Investment.create({
    user: owner._id, member: member._id, branchId: branch._id,
    type: 'deposit', accountType: 'current', amount: 5000,
  });
  return { customer, member, loan, ft, inv };
};

describe('deleteBranch cascade', () => {
  it('re-homes data to the promoted default branch when one remains', async () => {
    const owner = await makeOwner();
    const branchA = await makeBranch(owner, { isDefault: true });
    const branchB = await makeBranch(owner); // older-or-newer sibling that survives
    const { customer, member, loan, ft, inv } = await seedBranchData(owner, branchA);

    const res = mockRes();
    await deleteBranch(adminReq(owner, branchA._id), res);
    expect(res.statusCode).toBe(200);

    // branchB is promoted to default and inherits the orphaned records.
    const survivor = await Branch.findById(branchB._id);
    expect(survivor.isDefault).toBe(true);
    const bId = String(branchB._id);
    expect(String((await Member.findById(member._id)).branchId)).toBe(bId);
    expect(String((await Customer.findById(customer._id)).branchId)).toBe(bId);
    expect(String((await Loan.findById(loan._id)).branchId)).toBe(bId);
    expect(String((await FinancialTransaction.findById(ft._id)).branchId)).toBe(bId);
    expect(String((await Investment.findById(inv._id)).branchId)).toBe(bId);
  });

  it('unsets branchId on dependents when the last branch is deleted', async () => {
    const owner = await makeOwner();
    const onlyBranch = await makeBranch(owner, { isDefault: true });
    const { member, loan } = await seedBranchData(owner, onlyBranch);

    const res = mockRes();
    await deleteBranch(adminReq(owner, onlyBranch._id), res);
    expect(res.statusCode).toBe(200);

    expect((await Member.findById(member._id)).branchId).toBeFalsy();
    expect((await Loan.findById(loan._id)).branchId).toBeFalsy();
  });
});
