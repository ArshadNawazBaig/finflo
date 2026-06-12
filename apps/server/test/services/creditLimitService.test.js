/**
 * creditLimitService.calculateCreditLimit — capacity is 5× share balance scaled
 * by the member's credit-score band (see creditLimitScore.test.js for the
 * good-vs-bad ordering). Here we pin the mechanics that stay stable.
 */
const { calculateCreditLimit, updateMemberCreditLimit } = require('../../src/services/creditLimitService');
const { makeOwner, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');

describe('calculateCreditLimit', () => {
  it('applies the neutral Fair multiplier (0.85) for a member with no history', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { shareBalance: 10000, customer: customer._id });
    // 10000 × 5 × 0.85 (Fair) = 42500
    expect(await calculateCreditLimit(member._id)).toBe(42500);
  });

  it('lowers the limit for a defaulted member (Very Poor band)', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const member = await makeMember(owner, { shareBalance: 10000, customer: customer._id });
    await makeLoan(owner, customer, {
      status: 'defaulted',
      defaultedAt: new Date(),
      startDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
    });
    // Very Poor band → 0.25 × (10000 × 5) = 12500, below the Fair baseline.
    const limit = await calculateCreditLimit(member._id);
    expect(limit).toBe(12500);
    expect(limit).toBeLessThan(42500);
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
    // 20000 × 5 × 0.85 (Fair, no history) = 85000
    expect(updated.creditLimit).toBe(85000);
  });
});
