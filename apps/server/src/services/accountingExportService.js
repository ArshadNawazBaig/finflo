const { jsonToCSV } = require('../utils/csv');
const { roundMoney } = require('../utils/money');

// FinFlo's ledger (FinancialTransaction) uses free-string `category` values with
// a coarse `type` (income/expense/loan/credit/debit). Accounting software needs
// named GL accounts, so this is the single source of truth mapping each category
// to a chart-of-accounts line + its accounting nature.
const ACCOUNT_MAP = {
  repayment: { account: 'Loan Repayment Income', type: 'Income' },
  late_fee: { account: 'Fee Income', type: 'Income' },
  fee: { account: 'Fee Income', type: 'Income' },
  checkbook_fee: { account: 'Fee Income', type: 'Income' },
  tier_upgrade_fee: { account: 'Fee Income', type: 'Income' },
  term_deposit_break_fee: { account: 'Fee Income', type: 'Income' },
  manual_income: { account: 'Other Income', type: 'Income' },
  loan_disbursement: { account: 'Loans Receivable', type: 'Asset' },
  investment: { account: 'Member Deposits', type: 'Liability' },
  investment_deposit: { account: 'Member Deposits', type: 'Liability' },
  saving_deposit: { account: 'Member Savings', type: 'Liability' },
  share_deposit: { account: 'Member Shares', type: 'Equity' },
  business_capital: { account: 'Business Capital', type: 'Equity' },
  withdrawal: { account: 'Member Withdrawals', type: 'Liability' },
  saving_withdrawal: { account: 'Member Savings', type: 'Liability' },
  profit_distribution: { account: 'Profit Distribution', type: 'Equity' },
  saving_profit: { account: 'Profit Distribution', type: 'Equity' },
  share_profit: { account: 'Profit Distribution', type: 'Equity' },
  regular_profit: { account: 'Profit Distribution', type: 'Equity' },
  cash_opening: { account: 'Cash on Hand', type: 'Asset' },
};

// Contra account for the double-entry journal — every movement is settled
// against the business's cash/bank position.
const CLEARING_ACCOUNT = 'Cash/Bank';

const accountFor = (tx) => {
  if (ACCOUNT_MAP[tx.category]) return ACCOUNT_MAP[tx.category];
  if (tx.type === 'expense') return { account: 'Operating Expenses', type: 'Expense' };
  if (tx.type === 'income') return { account: 'Other Income', type: 'Income' };
  return { account: tx.category || 'Uncategorized', type: 'Other' };
};

// Inflows (money INTO the business) debit cash; outflows credit cash.
const isInflow = (tx) => tx.type === 'income' || tx.type === 'credit';

const amt = (tx) => roundMoney(Math.abs(Number(tx.amount) || 0)).toFixed(2);
const entityName = (tx) =>
  tx.member?.name || tx.customer?.name || '';
const refOf = (tx) =>
  `FT-${String(tx._id).slice(-8).toUpperCase()}`;

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDate = (d, style) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth() + 1);
  const day = pad2(dt.getDate());
  if (style === 'us') return `${m}/${day}/${y}`; // QuickBooks default
  if (style === 'uk') return `${day}/${m}/${y}`; // Xero default
  return `${y}-${m}-${day}`; // ISO (generic / journal)
};

// ── Format builders ─────────────────────────────────────────────────────────

// Generic: a full, human-readable ledger with debit/credit columns.
const buildGeneric = (txs) => {
  const rows = txs.map((tx) => {
    const inflow = isInflow(tx);
    const value = amt(tx);
    return {
      Date: fmtDate(tx.date, 'iso'),
      Reference: refOf(tx),
      Type: tx.type,
      Category: tx.category,
      Account: accountFor(tx).account,
      Description: tx.description || '',
      Entity: entityName(tx),
      PaymentMethod: tx.paymentMethod || '',
      Debit: inflow ? '' : value,
      Credit: inflow ? value : '',
      Amount: (inflow ? 1 : -1) * Number(value),
    };
  });
  return jsonToCSV(rows, [
    'Date', 'Reference', 'Type', 'Category', 'Account', 'Description',
    'Entity', 'PaymentMethod', 'Debit', 'Credit', 'Amount',
  ]);
};

// QuickBooks Online "bank transactions" 3-column CSV: Date, Description, Amount
// (signed: inflows positive, outflows negative).
const buildQuickBooks = (txs) => {
  const rows = txs.map((tx) => ({
    Date: fmtDate(tx.date, 'us'),
    Description: [tx.description, entityName(tx)].filter(Boolean).join(' — ') ||
      tx.category,
    Amount: ((isInflow(tx) ? 1 : -1) * Number(amt(tx))).toFixed(2),
  }));
  return jsonToCSV(rows, ['Date', 'Description', 'Amount']);
};

// Xero bank-statement CSV: Date, Amount (signed), Payee, Description, Reference.
const buildXero = (txs) => {
  const rows = txs.map((tx) => ({
    Date: fmtDate(tx.date, 'uk'),
    Amount: ((isInflow(tx) ? 1 : -1) * Number(amt(tx))).toFixed(2),
    Payee: entityName(tx),
    Description: tx.description || tx.category,
    Reference: refOf(tx),
  }));
  return jsonToCSV(rows, ['Date', 'Amount', 'Payee', 'Description', 'Reference']);
};

// Double-entry journal: two balanced lines per transaction (category account vs
// the cash clearing account), importable as manual journals.
const buildJournal = (txs) => {
  const rows = [];
  txs.forEach((tx, i) => {
    const journalNo = `J${String(i + 1).padStart(5, '0')}`;
    const value = amt(tx);
    const { account } = accountFor(tx);
    const inflow = isInflow(tx);
    const date = fmtDate(tx.date, 'iso');
    const desc = tx.description || tx.category;
    const reference = refOf(tx);
    // Inflow: Debit Cash / Credit <Account>. Outflow: the reverse.
    rows.push({
      Date: date, JournalNo: journalNo,
      Account: inflow ? CLEARING_ACCOUNT : account,
      Debit: value, Credit: '', Description: desc, Reference: reference,
      Name: entityName(tx),
    });
    rows.push({
      Date: date, JournalNo: journalNo,
      Account: inflow ? account : CLEARING_ACCOUNT,
      Debit: '', Credit: value, Description: desc, Reference: reference,
      Name: entityName(tx),
    });
  });
  return jsonToCSV(rows, [
    'Date', 'JournalNo', 'Account', 'Debit', 'Credit', 'Description',
    'Reference', 'Name',
  ]);
};

const BUILDERS = {
  generic: buildGeneric,
  quickbooks: buildQuickBooks,
  xero: buildXero,
  journal: buildJournal,
};

const FORMATS = Object.keys(BUILDERS);

/**
 * Build an accounting-export CSV from ledger transactions.
 * @param {object[]} transactions FinancialTransaction docs (lean, sorted by date)
 * @param {string} [format] one of generic | quickbooks | xero | journal
 * @returns {{ filename: string, csv: string, format: string }}
 */
const buildExport = (transactions, format = 'generic') => {
  const fmt = FORMATS.includes(format) ? format : 'generic';
  const csv = BUILDERS[fmt](transactions || []);
  const stamp = fmtDate(new Date(transactions?.[0]?.date || Date.now()), 'iso');
  return { format: fmt, csv, filename: `accounting-export-${fmt}-${stamp}.csv` };
};

module.exports = {
  buildExport,
  accountFor,
  isInflow,
  ACCOUNT_MAP,
  FORMATS,
};
