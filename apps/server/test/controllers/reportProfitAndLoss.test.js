/**
 * reportController.getProfitAndLoss — net income = revenue − operating expenses,
 * with profit distributions reported BELOW net income as an equity appropriation
 * (B2 fix), and business-capital flows excluded from opex.
 */
const Repayment = require('../../src/models/Repayment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const ProfitDistribution = require('../../src/models/ProfitDistribution');
const { getProfitAndLoss } = require('../../src/controllers/reportController');
const { makeOwner, makeMember, makeCustomer, makeLoan } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const adminReq = (owner) => ({
  user: { effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false },
  query: {},
});

describe('getProfitAndLoss', () => {
  it('computes revenue, opex, net income and distributions correctly', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer);
    const now = new Date();

    // Interest revenue 2000 (from a repayment's interest portion).
    await Repayment.create({
      user: owner._id, loan: loan._id, customer: customer._id,
      amount: 5000, principalAmount: 3000, interestAmount: 2000, date: now, status: 'Completed',
    });
    // Fee income 500.
    await FinancialTransaction.create({
      user: owner._id, type: 'income', category: 'late_fee', amount: 500, date: now,
    });
    // Operating expense 1000 (counts) + business_capital 5000 (excluded from opex).
    await FinancialTransaction.create({ user: owner._id, type: 'expense', category: 'rent', amount: 1000, date: now });
    await FinancialTransaction.create({ user: owner._id, type: 'expense', category: 'business_capital', amount: 5000, date: now });
    // Profit distribution 800 (equity appropriation, below the line).
    await ProfitDistribution.create({ user: owner._id, member: member._id, amount: 800, type: 'regular', period: 'Jun 2026', date: now });

    const res = mockRes();
    await getProfitAndLoss(adminReq(owner), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.revenue.interestEarned).toBe(2000);
    expect(res.body.revenue.feeIncome).toBe(500);
    expect(res.body.revenue.totalRevenue).toBe(2500);
    expect(res.body.expenses.totalExpenses).toBe(1000); // business_capital excluded
    expect(res.body.netIncome).toBe(1500); // 2500 − 1000, NOT minus the 800 distribution
    expect(res.body.distributions.totalDistributions).toBe(800);
    expect(res.body.retainedEarningsMovement).toBe(700); // 1500 − 800
  });

  it('returns zeroes for a tenant with no activity', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await getProfitAndLoss(adminReq(owner), res);
    expect(res.body.revenue.totalRevenue).toBe(0);
    expect(res.body.netIncome).toBe(0);
  });
});
