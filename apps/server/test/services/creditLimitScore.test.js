/**
 * The credit score now drives the credit limit: at the same share balance, a
 * member with strong history gets a higher limit than one with a recent default.
 */
const { calculateCreditLimit } = require('../../src/services/creditLimitService');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeLoan,
} = require('../helpers/factories');

const DAY = 24 * 60 * 60 * 1000;

describe('calculateCreditLimit — score-driven', () => {
  it('lends a healthy member more than a defaulted one at equal shares', async () => {
    const owner = await makeOwner();

    // Healthy: a completed loan, no delinquency.
    const goodMember = await makeMember(owner, { shareBalance: 100000 });
    const goodCust = await makeCustomer(owner, {
      name: 'good',
      isMember: true,
      memberId: goodMember._id,
    });
    goodMember.customer = goodCust._id;
    await goodMember.save();
    await makeLoan(owner, goodCust, { status: 'completed' });

    // Risky: a recent default, same share balance.
    const badMember = await makeMember(owner, { shareBalance: 100000 });
    const badCust = await makeCustomer(owner, {
      name: 'bad',
      isMember: true,
      memberId: badMember._id,
    });
    badMember.customer = badCust._id;
    await badMember.save();
    await makeLoan(owner, badCust, {
      status: 'defaulted',
      defaultedAt: new Date(),
      startDate: new Date(Date.now() - 400 * DAY),
    });

    const goodLimit = await calculateCreditLimit(goodMember._id);
    const badLimit = await calculateCreditLimit(badMember._id);

    expect(goodLimit).toBeGreaterThan(badLimit);
    // Defaulter lands in the lowest band → 0.25 × (100000 × 5) = 125000.
    expect(badLimit).toBe(125000);
  });

  it('returns 0 for an unknown member', async () => {
    const owner = await makeOwner();
    const m = await makeMember(owner, { shareBalance: 0 });
    expect(await calculateCreditLimit(m._id)).toBe(0);
  });
});
