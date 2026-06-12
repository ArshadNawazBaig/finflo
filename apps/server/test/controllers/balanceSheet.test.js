/**
 * Balance Sheet — correctness of the aggregation rewrite.
 *
 * Like the trial balance, getBalanceSheet previously loaded the whole Loan /
 * Member / FinancialTransaction collections (FinancialTransaction with no date
 * bound) and reduced in JS. They are now summed in MongoDB. This locks in the
 * assets / liabilities / equity figures and the term-deposit handling.
 */
const Member = require('../../src/models/Member');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const ProfitDistribution = require('../../src/models/ProfitDistribution');
const reportController = require('../../src/controllers/reportController');
const {
  makeOwner,
  makeCustomer,
  makeMember,
  makeLoan,
  makeRepayment,
  makeTermDeposit,
} = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const seedMemberCounters = (owner, customer) =>
  Member.create({
    user: owner._id,
    customer: customer._id,
    email: `bs-${Date.now()}-${Math.round(performance.now())}@test.com`,
    phone: '03000000000',
    password: 'password123',
    cnic: `bs-${Date.now()}-${Math.round(performance.now())}`,
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

describe('getBalanceSheet — aggregation rewrite correctness', () => {
  it('computes assets, liabilities, and equity from DB aggregations', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    await seedMemberCounters(owner, customer);

    const loan = await makeLoan(owner, customer, {
      principal: 20000,
      totalAmount: 24000,
      paidAmount: 12000,
      status: 'active',
    });
    await makeRepayment(owner, loan, customer, {
      amount: 12000,
      interestAmount: 2000,
    });

    await FinancialTransaction.create([
      { user: owner._id, type: 'expense', category: 'rent', amount: 3000 },
      {
        user: owner._id,
        type: 'expense',
        category: 'profit_distribution',
        amount: 9999,
      },
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
      { user: owner._id, type: 'income', category: 'late_fee', amount: 500 },
      {
        user: owner._id,
        type: 'income',
        category: 'fee',
        amount: 999,
        status: 'Reversed',
      },
    ]);

    await ProfitDistribution.create({
      user: owner._id,
      member: customer._id,
      amount: 1000,
      type: 'regular',
      period: 'Jan 2026',
    });

    const res = mockRes();
    await reportController.getBalanceSheet(ownerReq(owner), res);

    expect(res.statusCode).toBe(200);
    const { assets, liabilities, equity } = res.body;

    expect(assets.cashAtHand).toBe(169500);
    expect(assets.loansReceivable).toBe(10000);
    expect(assets.termDepositsHeld).toBe(0);
    expect(assets.totalAssets).toBe(179500);

    expect(liabilities.memberCurrentAccounts).toBe(50000);
    expect(liabilities.memberSavingAccounts).toBe(20000);
    expect(liabilities.memberShareCapital).toBe(15000);
    expect(liabilities.totalLiabilities).toBe(85000);

    expect(equity.interestEarned).toBe(2000);
    expect(equity.feeIncome).toBe(500);
    expect(equity.profitDistributed).toBe(1000);
    expect(equity.operatingExpenses).toBe(3000);
    // 2000 + 500 - 3000 - 1000 - 0 = -1500
    expect(equity.retainedEarnings).toBe(-1500);
    expect(equity.businessCapital).toBe(30000);
    expect(equity.totalEquity).toBe(28500);
  });

  it('counts an active term deposit as an asset and an obligation', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const DAY = 24 * 60 * 60 * 1000;
    await makeTermDeposit(owner, member, {
      principal: 100000,
      projectedProfit: 12000,
      startDate: new Date(Date.now() - 100 * DAY),
      maturityDate: new Date(Date.now() + 100 * DAY),
      status: 'active',
    });

    const res = mockRes();
    await reportController.getBalanceSheet(ownerReq(owner), res);

    expect(res.statusCode).toBe(200);
    // Principal is held as an asset regardless of elapsed time.
    expect(res.body.assets.termDepositsHeld).toBe(100000);
    // Obligation = principal + profit accrued to date (~half of 12000).
    expect(res.body.liabilities.termDepositObligations).toBeGreaterThan(100000);
    expect(res.body.liabilities.termDepositObligations).toBeLessThan(107000);
  });
});
