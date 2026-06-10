/**
 * Tests for calculateEffectiveBalance — net of wallet balance minus outstanding
 * active/overdue loan debt. Touches the DB (Member + Loan).
 */
const { calculateEffectiveBalance } = require('../../src/utils/balanceUtils');
const { makeOwner, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');

describe('calculateEffectiveBalance', () => {
  it('returns the wallet balance when the member has no linked customer', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 8000 });
    expect(await calculateEffectiveBalance(member._id)).toBe(8000);
  });

  it('subtracts outstanding debt of active/overdue loans', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { currentBalance: 50000, customer: customer._id });
    await makeLoan(owner, customer, { remainingAmount: 30000, status: 'active' });

    expect(await calculateEffectiveBalance(member._id)).toBe(20000);
  });

  it('ignores completed loans', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { currentBalance: 50000, customer: customer._id });
    await makeLoan(owner, customer, { remainingAmount: 0, status: 'completed' });

    expect(await calculateEffectiveBalance(member._id)).toBe(50000);
  });

  it('can go negative when debt exceeds savings', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { currentBalance: 10000, customer: customer._id });
    await makeLoan(owner, customer, { remainingAmount: 25000, status: 'overdue' });

    expect(await calculateEffectiveBalance(member._id)).toBe(-15000);
  });

  it('returns 0 for a missing member', async () => {
    const mongoose = require('mongoose');
    expect(await calculateEffectiveBalance(new mongoose.Types.ObjectId())).toBe(0);
  });
});
