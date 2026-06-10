/**
 * creditLimitService.calculateCreditLimit — 5× share balance scaled by a
 * performance multiplier (completed loans reward, overdue/defaulted penalty).
 */
const { calculateCreditLimit, updateMemberCreditLimit } = require('../../src/services/creditLimitService');
const { makeOwner, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');

describe('calculateCreditLimit', () => {
  it('is 5× share balance with no loan history (multiplier 1.0)', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { shareBalance: 10000, customer: customer._id });
    expect(await calculateCreditLimit(member._id)).toBe(50000);
  });

  it('rewards completed loans at +0.1 each', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { shareBalance: 10000, customer: customer._id });
    await makeLoan(owner, customer, { status: 'completed' });
    await makeLoan(owner, customer, { status: 'completed' });
    // 50000 × (1.0 + 0.2) = 60000
    expect(await calculateCreditLimit(member._id)).toBe(60000);
  });

  it('caps the reward multiplier at 1.5', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { shareBalance: 10000, customer: customer._id });
    for (let i = 0; i < 10; i++) await makeLoan(owner, customer, { status: 'completed' });
    expect(await calculateCreditLimit(member._id)).toBe(75000); // 50000 × 1.5
  });

  it('penalizes any overdue/defaulted history to a 0.5 multiplier', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { shareBalance: 10000, customer: customer._id });
    await makeLoan(owner, customer, { status: 'completed' });
    await makeLoan(owner, customer, { status: 'overdue' });
    expect(await calculateCreditLimit(member._id)).toBe(25000); // 50000 × 0.5
  });

  it('is 0 with no share balance and 0 for a missing member', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { shareBalance: 0 });
    expect(await calculateCreditLimit(member._id)).toBe(0);
    const mongoose = require('mongoose');
    expect(await calculateCreditLimit(new mongoose.Types.ObjectId())).toBe(0);
  });
});

describe('updateMemberCreditLimit', () => {
  it('persists the computed limit on the member', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { shareBalance: 20000, customer: customer._id });
    const updated = await updateMemberCreditLimit(member._id);
    expect(updated.creditLimit).toBe(100000); // 20000 × 5 × 1.0
  });
});
