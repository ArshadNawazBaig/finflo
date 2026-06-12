/**
 * The credit-scoring engine: new customers get a neutral band, real on-time
 * history scores high, recent defaults score low, the result is deterministic
 * and always clamped 0-100, and an at-risk group applies its penalty.
 */
const { computeCreditScore } = require('../../src/services/creditScoringService');
const {
  makeOwner,
  makeMember,
  makeCustomer,
  makeLoan,
  makeRepayment,
  makeGroup,
} = require('../helpers/factories');

const DAY = 24 * 60 * 60 * 1000;

describe('computeCreditScore', () => {
  it('gives a brand-new customer a neutral Fair band', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'fresh' });

    const result = await computeCreditScore(cust._id);
    expect(result.band).toBe('Fair');
    expect(result.score).toBe(60);
    expect(result.factors[0]).toMatch(/new customer/i);
  });

  it('scores a clean on-time repayment history highly', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, {
      name: 'good payer',
      monthlyIncome: 200000,
    });
    // A completed loan with 6 on-time installments.
    const loan = await makeLoan(owner, cust, {
      status: 'completed',
      principal: 60000,
      startDate: new Date(Date.now() - 200 * DAY),
    });
    for (let i = 1; i <= 6; i++) {
      const due = new Date(loan.startDate);
      due.setMonth(due.getMonth() + i);
      // Paid a day before the due date → on time.
      await makeRepayment(owner, loan, cust, {
        installmentNumber: i,
        date: new Date(due.getTime() - 1 * DAY),
      });
    }

    const result = await computeCreditScore(cust._id);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(['Good', 'Excellent']).toContain(result.band);
    expect(result.components.punctuality.onTime).toBe(6);
    expect(result.components.punctuality.late).toBe(0);
  });

  it('scores a recent default very low', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'defaulter' });
    await makeLoan(owner, cust, {
      status: 'defaulted',
      defaultedAt: new Date(),
      startDate: new Date(Date.now() - 400 * DAY),
    });

    const result = await computeCreditScore(cust._id);
    expect(result.band).toBe('Very Poor');
    expect(result.score).toBeLessThan(40);
    expect(result.components.delinquency.defaults).toBe(1);
  });

  it('is deterministic and clamped to 0-100', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'stable' });
    await makeLoan(owner, cust, { status: 'completed' });

    const a = await computeCreditScore(cust._id);
    const b = await computeCreditScore(cust._id);
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
  });

  it('penalizes membership of an at-risk lending group', async () => {
    const owner = await makeOwner();
    const cust = await makeCustomer(owner, { name: 'grouped' });
    await makeLoan(owner, cust, { status: 'active' });
    const baseline = await computeCreditScore(cust._id);

    await makeGroup(owner, [cust], { status: 'at_risk' });
    const penalized = await computeCreditScore(cust._id);

    expect(penalized.score).toBeLessThan(baseline.score);
    expect(penalized.components.group.points).toBe(0);
  });
});
