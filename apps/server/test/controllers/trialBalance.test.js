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

  it('stays balanced after a share withdrawal (no totalShareWithdrawn field)', async () => {
    // Regression: cashAtHand used to add GROSS totalShareInvested while the
    // liability side used the NET shareBalance. There is no totalShareWithdrawn
    // counter, so a share redemption left cash overstated by the withdrawn
    // amount and produced a phantom A ≠ L + E discrepancy. Cash from shares must
    // be shareBalance − totalShareProfit (= deposits − withdrawals; profit is a
    // non-cash credit). Here: invested 10000, profit 1000 credited, 3000
    // withdrawn → shareBalance 8000, totalShareProfit 1000.
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);

    await Member.create({
      user: owner._id,
      customer: customer._id,
      email: `tb-share-${Date.now()}@test.com`,
      phone: '03000000001',
      password: 'password123',
      cnic: `tb-share-${Date.now()}`,
      status: 'Active',
      totalShareInvested: 10000,
      totalShareProfit: 1000,
      shareBalance: 8000,
    });

    // The share profit is also booked as a ProfitDistribution (type 'share'),
    // which is what reduces retained earnings — mirroring distributeShareProfit.
    await ProfitDistribution.create({
      user: owner._id,
      member: customer._id,
      amount: 1000,
      type: 'share',
      period: 'Jan 2026',
    });

    const res = mockRes();
    await reportController.getTrialBalance(ownerReq(owner), res);

    expect(res.statusCode).toBe(200);
    // Cash from shares = 8000 − 1000 = 7000 (NOT the gross 10000 invested).
    expect(res.body.assets.cashAtHand).toBe(7000);
    expect(res.body.assets.totalAssets).toBe(7000);
    // Liability is the net share balance.
    expect(res.body.liabilities.memberShareCapital).toBe(8000);
    // Share profit (1000) reduces retained earnings, offsetting the +1000 in
    // the share liability, so the books foot exactly.
    expect(res.body.equity.retainedEarnings).toBe(-1000);
    expect(res.body.discrepancy).toBe(0);
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
