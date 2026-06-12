/**
 * ledgerController.getLedger — the unified financial ledger. It must:
 *  - return only the calling tenant's FinancialTransaction rows (no cross-tenant leak),
 *  - reconcile a known seed set into matching income/expense totals, so that a
 *    balanced book (every debit has an offsetting credit) nets to zero, and
 *  - exclude system-generated rows (cash_opening / saving_profit) from the feed.
 */
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const ledgerController = require('../../src/controllers/ledgerController');
const { makeOwner } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const ledgerReq = (owner, query = {}) => ({
  user: { _id: owner._id, effectiveOwnerId: owner._id, role: 'admin', isSuperAdmin: false, branchId: undefined },
  params: {},
  query: { limit: 100, ...query },
  body: {},
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

// Seed a balanced book: each income (deposit/repayment) is mirrored by an equal
// expense (disbursement/withdrawal), so the ledger nets to zero.
const seedBalancedBook = async (owner) => {
  await FinancialTransaction.create([
    { user: owner._id, type: 'income', category: 'investment', amount: 10000, status: 'Completed' },
    { user: owner._id, type: 'expense', category: 'withdrawal', amount: 10000, status: 'Completed' },
    { user: owner._id, type: 'income', category: 'repayment', amount: 5000, status: 'Completed' },
    { user: owner._id, type: 'loan', category: 'loan_disbursement', amount: 5000, status: 'Completed' },
  ]);
};

describe('getLedger — double-entry integrity & tenant scoping', () => {
  it('reconciles a balanced seed set: income equals expense and nets to zero', async () => {
    const owner = await makeOwner();
    await seedBalancedBook(owner);

    const res = mockRes();
    await ledgerController.getLedger(ledgerReq(owner), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalEntries).toBe(4);
    expect(res.body.summary.totalIncome).toBe(15000); // 10000 + 5000
    expect(res.body.summary.totalExpense).toBe(15000); // 10000 + 5000
    // Balanced book → debits and credits reconcile.
    expect(res.body.summary.totalIncome - res.body.summary.totalExpense).toBe(0);
  });

  it('does not leak another tenant\'s transactions into the ledger', async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    await seedBalancedBook(ownerA);
    // Owner B has its own, differently-sized book.
    await FinancialTransaction.create([
      { user: ownerB._id, type: 'income', category: 'investment', amount: 999, status: 'Completed' },
      { user: ownerB._id, type: 'expense', category: 'withdrawal', amount: 999, status: 'Completed' },
    ]);

    const res = mockRes();
    await ledgerController.getLedger(ledgerReq(ownerA), res);

    expect(res.body.totalEntries).toBe(4); // only A's rows
    // None of B's rows present.
    expect(res.body.data.every((t) => String(t.user) === String(ownerA._id))).toBe(true);
    expect(res.body.summary.totalIncome).toBe(15000); // unaffected by B's 999
    expect(res.body.summary.totalExpense).toBe(15000);
  });

  it('excludes system-generated rows (cash_opening / saving_profit) from the feed', async () => {
    const owner = await makeOwner();
    await FinancialTransaction.create([
      { user: owner._id, type: 'income', category: 'repayment', amount: 7000, status: 'Completed' },
      { user: owner._id, type: 'income', category: 'cash_opening', amount: 50000, status: 'Completed' },
      { user: owner._id, type: 'income', category: 'saving_profit', amount: 1200, status: 'Completed' },
    ]);

    const res = mockRes();
    await ledgerController.getLedger(ledgerReq(owner), res);

    expect(res.body.totalEntries).toBe(1); // only the repayment
    expect(res.body.summary.totalIncome).toBe(7000); // system rows not counted
    const categories = res.body.data.map((t) => t.category);
    expect(categories).not.toContain('cash_opening');
    expect(categories).not.toContain('saving_profit');
  });

  it('an empty tenant ledger reconciles to zero', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await ledgerController.getLedger(ledgerReq(owner), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalEntries).toBe(0);
    expect(res.body.summary.totalIncome).toBe(0);
    expect(res.body.summary.totalExpense).toBe(0);
  });
});
