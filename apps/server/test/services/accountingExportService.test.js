/**
 * Unit tests for the accounting export builder — verifies each format's shape and
 * that the double-entry journal always balances (sum debits == sum credits).
 */
const {
  buildExport,
  accountFor,
  isInflow,
  FORMATS,
} = require('../../src/services/accountingExportService');

const txs = [
  { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', type: 'income', category: 'repayment', amount: 1500, date: new Date('2026-01-10'), description: 'Loan repayment', member: { name: 'Ali' } },
  { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', type: 'income', category: 'late_fee', amount: 200.5, date: new Date('2026-01-11'), description: 'Late fee', customer: { name: 'Sara' } },
  { _id: 'cccccccccccccccccccccccc', type: 'expense', category: 'rent', amount: 5000, date: new Date('2026-01-12'), description: 'Office rent' },
  { _id: 'dddddddddddddddddddddddd', type: 'credit', category: 'saving_deposit', amount: 3000, date: new Date('2026-01-13'), description: 'Deposit', member: { name: 'Ali' } },
];

const parse = (csv) => {
  const [header, ...rows] = csv.split('\n');
  const cols = header.split(',');
  return rows.map((r) => {
    // naive split is fine here — our test data has no embedded commas
    const cells = r.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
};

describe('accountFor / isInflow', () => {
  it('maps known categories to GL accounts', () => {
    expect(accountFor({ category: 'repayment', type: 'income' }).account).toBe('Loan Repayment Income');
    expect(accountFor({ category: 'late_fee', type: 'income' }).account).toBe('Fee Income');
    expect(accountFor({ category: 'saving_deposit', type: 'credit' }).account).toBe('Member Savings');
  });
  it('falls back by type for unknown categories', () => {
    expect(accountFor({ category: 'rent', type: 'expense' }).account).toBe('Operating Expenses');
    expect(accountFor({ category: 'misc', type: 'income' }).account).toBe('Other Income');
  });
  it('classifies inflows vs outflows', () => {
    expect(isInflow({ type: 'income' })).toBe(true);
    expect(isInflow({ type: 'credit' })).toBe(true);
    expect(isInflow({ type: 'expense' })).toBe(false);
    expect(isInflow({ type: 'loan' })).toBe(false);
  });
});

describe('buildExport formats', () => {
  it('exposes the supported formats', () => {
    expect(FORMATS).toEqual(['generic', 'quickbooks', 'xero', 'journal']);
  });

  it('generic: one row per transaction with debit/credit split', () => {
    const { csv, filename } = buildExport(txs, 'generic');
    const rows = parse(csv);
    expect(rows).toHaveLength(4);
    expect(filename).toMatch(/^accounting-export-generic-\d{4}-\d{2}-\d{2}\.csv$/);
    const repay = rows[0];
    expect(repay.Account).toBe('Loan Repayment Income');
    expect(repay.Credit).toBe('1500.00'); // income → credit
    expect(repay.Debit).toBe('');
    expect(rows[2].Debit).toBe('5000.00'); // expense → debit
  });

  it('quickbooks: Date/Description/Amount with signed amounts', () => {
    const rows = parse(buildExport(txs, 'quickbooks').csv);
    expect(Object.keys(rows[0])).toEqual(['Date', 'Description', 'Amount']);
    expect(rows[0].Amount).toBe('1500.00'); // inflow positive
    expect(rows[2].Amount).toBe('-5000.00'); // expense negative
    expect(rows[0].Date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/); // MM/DD/YYYY
  });

  it('xero: Date/Amount/Payee/Description/Reference', () => {
    const rows = parse(buildExport(txs, 'xero').csv);
    expect(Object.keys(rows[0])).toEqual(['Date', 'Amount', 'Payee', 'Description', 'Reference']);
    expect(rows[0].Payee).toBe('Ali');
    expect(rows[3].Amount).toBe('3000.00');
  });

  it('journal: two balanced lines per transaction', () => {
    const rows = parse(buildExport(txs, 'journal').csv);
    expect(rows).toHaveLength(8); // 4 tx × 2 lines
    const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    // Double-entry must balance exactly.
    expect(sum('Debit')).toBeCloseTo(sum('Credit'), 2);
    // An income tx debits Cash/Bank and credits its income account.
    expect(rows[0].Account).toBe('Cash/Bank');
    expect(rows[0].Debit).toBe('1500.00');
    expect(rows[1].Account).toBe('Loan Repayment Income');
    expect(rows[1].Credit).toBe('1500.00');
  });

  it('falls back to generic for an unknown format', () => {
    expect(buildExport(txs, 'nope').format).toBe('generic');
  });

  it('handles an empty ledger', () => {
    expect(buildExport([], 'generic').csv).toBe('');
  });
});
