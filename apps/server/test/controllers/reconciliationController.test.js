/**
 * reconciliationController.resolveMemberBalances — the wallet rebuild must keep
 * borrowed money (loan_disbursement) apart from member capital while still fully
 * backing the wallet balance (B5).
 */
const Member = require('../../src/models/Member');
const Investment = require('../../src/models/Investment');
const reconciliationController = require('../../src/controllers/reconciliationController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

describe('resolveMemberBalances — loan proceeds vs capital', () => {
  it('separates loan proceeds from capital; balance still backs out', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, {
      currentBalance: 0,
      totalInvested: 0,
      totalLoanProceeds: 0,
    });
    await Investment.create({
      user: owner._id, member: member._id, type: 'deposit', accountType: 'current', amount: 5000,
    });
    await Investment.create({
      user: owner._id, member: member._id, type: 'loan_disbursement', accountType: 'current', amount: 20000,
    });

    const req = { user: { effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false } };
    await reconciliationController.resolveMemberBalances(req, mockRes());

    const fresh = await Member.findById(member._id);
    expect(fresh.totalInvested).toBe(5000); // capital only
    expect(fresh.totalLoanProceeds).toBe(20000); // borrowed money tracked apart
    expect(fresh.currentBalance).toBe(25000); // wallet fully backed
  });
});
