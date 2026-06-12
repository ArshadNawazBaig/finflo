/**
 * Ledger summary + running balance — correctness of the aggregation rewrite.
 *
 * getLedger previously loaded EVERY matching transaction on each paginated
 * request to compute the income/expense summary and the per-page running
 * balance. Those are now a `$group` summary aggregation and a bounded
 * `$sort`+`$limit`+`$group` prior-balance aggregation. This locks in the exact
 * same figures (classification, totals, and priorPageBalance across pages and
 * sort directions).
 */
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const ledgerController = require('../../src/controllers/ledgerController');
const { makeOwner } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

// Five transactions, oldest→newest, exercising each classification branch:
//   #1 income/repayment 1000   (income)
//   #2 income/investment 2000  (income)
//   #3 expense/rent 500        (expense)
//   #4 loan/loan_disbursement 3000 (expense via type 'loan' + 'disbursement')
//   #5 debit/withdrawal 800    (expense via 'withdrawal')
// totalIncome = 3000, totalExpense = 4300. Signed (income +, else −): -1300.
const seedTxns = async (owner) => {
  const D = (d) => new Date(`2026-01-0${d}T10:00:00.000Z`);
  await FinancialTransaction.create([
    { user: owner._id, type: 'income', category: 'repayment', amount: 1000, date: D(1) },
    { user: owner._id, type: 'income', category: 'investment', amount: 2000, date: D(2) },
    { user: owner._id, type: 'expense', category: 'rent', amount: 500, date: D(3) },
    { user: owner._id, type: 'loan', category: 'loan_disbursement', amount: 3000, date: D(4) },
    { user: owner._id, type: 'debit', category: 'withdrawal', amount: 800, date: D(5) },
  ]);
};

const callLedger = async (owner, query) => {
  const res = mockRes();
  await ledgerController.getLedger(ownerReq(owner, { query }), res);
  return res.body;
};

describe('getLedger — summary + running balance (aggregation rewrite)', () => {
  it('summary totals are classified and summed correctly', async () => {
    const owner = await makeOwner();
    await seedTxns(owner);

    const body = await callLedger(owner, { page: '1', limit: '2' });
    expect(body.summary.totalIncome).toBe(3000);
    expect(body.summary.totalExpense).toBe(4300);
    expect(body.summary.totalTransactions).toBe(5);
    expect(body.totalEntries).toBe(5);
    expect(body.data).toHaveLength(2);
  });

  it('priorPageBalance is the signed sum of chronologically-prior rows (desc)', async () => {
    const owner = await makeOwner();
    await seedTxns(owner);

    // Desc (newest first), page 1 of 2 → shows #5,#4; prior = #1,#2,#3 =
    // 1000 + 2000 - 500 = 2500.
    const p1 = await callLedger(owner, { page: '1', limit: '2' });
    expect(p1.priorPageBalance).toBe(2500);

    // Page 2 → shows #3,#2; prior = #1 = 1000.
    const p2 = await callLedger(owner, { page: '2', limit: '2' });
    expect(p2.priorPageBalance).toBe(1000);
  });

  it('priorPageBalance follows ascending sort too', async () => {
    const owner = await makeOwner();
    await seedTxns(owner);

    // Asc (oldest first), page 1 → #1,#2; nothing prior → 0.
    const p1 = await callLedger(owner, { page: '1', limit: '2', sortOrder: 'asc' });
    expect(p1.priorPageBalance).toBe(0);

    // Page 2 → #3,#4; prior = #1,#2 = 3000.
    const p2 = await callLedger(owner, { page: '2', limit: '2', sortOrder: 'asc' });
    expect(p2.priorPageBalance).toBe(3000);
  });

  it('is tenant-scoped — another owner’s rows do not leak into the summary', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    await seedTxns(ownerA);
    await FinancialTransaction.create({
      user: ownerB._id,
      type: 'income',
      category: 'repayment',
      amount: 999999,
      date: new Date('2026-01-06T10:00:00.000Z'),
    });

    const body = await callLedger(ownerA, { page: '1', limit: '10' });
    expect(body.summary.totalIncome).toBe(3000);
    expect(body.totalEntries).toBe(5);
  });
});
