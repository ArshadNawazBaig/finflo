/**
 * Trial Balance — correctness of the aggregation rewrite.
 *
 * getTrialBalance previously loaded the whole Loan / Member / FinancialTransaction
 * collections (the last with NO date bound) and reduced them in JS. They are now
 * summed in MongoDB via $group / conditional-sum aggregations. This locks in that
 * the exact same figures come out — operating-expense exclusions, business-capital
 * flows, fee income (excluding reversals), and the assets/liabilities/equity math.
 */
const Member = require('../../src/models/Member');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const ProfitDistribution = require('../../src/models/ProfitDistribution');
const reportController = require('../../src/controllers/reportController');
const {
  makeOwner,
  makeCustomer,
  makeLoan,
  makeRepayment,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

describe('getTrialBalance — aggregation rewrite correctness', () => {
  it('computes assets, liabilities, and equity from DB aggregations', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);

    // One member with known pre-aggregated counters.
    await Member.create({
      user: owner._id,
      customer: customer._id,
      email: `tb-${Date.now()}@test.com`,
      phone: '03000000000',
      password: 'password123',
      cnic: `tb-${Date.now()}`,
      status: 'Active',
      totalInvested: 100000,
      totalLoanProceeds: 20000,
      totalWithdrawn: 5000,
      totalSavingDeposited: 30000,
      totalSavingWithdrawn: 10000,
      totalShareInvested: 15000,
      currentBalance: 50000,
      savingBalance: 20000,
      shareBalance: 15000,
    });

    // One loan: principal 20000 disbursed, 12000 repaid.
    const loan = await makeLoan(owner, customer, {
      principal: 20000,
      totalAmount: 24000,
      paidAmount: 12000,
      status: 'active',
    });
    // A repayment carrying 2000 of recognised interest (drives retained earnings).
    await makeRepayment(owner, loan, customer, {
      amount: 12000,
      interestAmount: 2000,
    });

    // Financial transactions exercising every conditional branch:
    await FinancialTransaction.create([
      // Operating expense — counts (3000).
      { user: owner._id, type: 'expense', category: 'rent', amount: 3000 },
      // Excluded opex (distribution shadow) — must NOT count.
      {
        user: owner._id,
        type: 'expense',
        category: 'profit_distribution',
        amount: 9999,
      },
      // Business capital injection / withdrawal (equity flows).
      {
        user: owner._id,
        type: 'income',
        category: 'business_capital',
        amount: 40000,
      },
      {
        user: owner._id,
        type: 'expense',
        category: 'business_capital',
        amount: 10000,
      },
      // Fee income — counts (500).
      { user: owner._id, type: 'income', category: 'late_fee', amount: 500 },
      // Reversed fee — must NOT count.
      {
        user: owner._id,
        type: 'income',
        category: 'fee',
        amount: 999,
        status: 'Reversed',
      },
    ]);

    // A profit distribution (reduces retained earnings).
    await ProfitDistribution.create({
      user: owner._id,
      member: customer._id,
      amount: 1000,
      type: 'regular',
      period: 'Jan 2026',
    });

    const res = mockRes();
    await reportController.getTrialBalance(ownerReq(owner), res);

    expect(res.statusCode).toBe(200);
    const { assets, liabilities, equity } = res.body;

    // cashAtHand = 100000 + 20000 - 5000 + 30000 - 10000 + 15000
    //            + 12000 - 20000 - 3000 + 500 + (40000 - 10000) = 169500
    expect(assets.cashAtHand).toBe(169500);
    // loansReceivable = 20000 - (12000 - 2000) = 10000
    expect(assets.loansReceivable).toBe(10000);
    expect(assets.totalAssets).toBe(179500);

    // Liabilities = member current + saving + share balances.
    expect(liabilities.memberCapital).toBe(50000);
    expect(liabilities.memberSavingAccounts).toBe(20000);
    expect(liabilities.memberShareCapital).toBe(15000);
    expect(liabilities.totalLiabilities).toBe(85000);

    // retainedEarnings = interest(2000) + fee(500) - distributed(1000) - opex(3000) = -1500
    expect(equity.retainedEarnings).toBe(-1500);
    // businessCapital = 40000 - 10000 = 30000
    expect(equity.businessCapital).toBe(30000);
    expect(equity.totalEquity).toBe(28500);
  });

  it('is tenant-scoped — another owner’s rows do not leak in', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    // ownerB has a large expense that must not affect ownerA's trial balance.
    await FinancialTransaction.create({
      user: ownerB._id,
      type: 'expense',
      category: 'rent',
      amount: 500000,
    });

    const res = mockRes();
    await reportController.getTrialBalance(ownerReq(ownerA), res);

    expect(res.statusCode).toBe(200);
    // ownerA has no data → all zeros, unaffected by ownerB's 500k expense.
    expect(res.body.assets.totalAssets).toBe(0);
    expect(res.body.equity.retainedEarnings).toBe(0);
  });
});
