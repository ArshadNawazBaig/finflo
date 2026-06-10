const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  // Divide by |previous|, not previous. Several baselines here can be negative
  // (net liquidity, net business capital, net income); dividing by a negative
  // previous flipped the sign so an improvement (-10k → +10k) reported as a
  // -200% decline.
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return Number(change.toFixed(1));
};

// Adds `months` to `date` without the setMonth() roll-forward bug
// (e.g. Jan 31 + 1 month should land on Feb 28/29, not Mar 2/3).
const addMonthsSafe = (date, months) => {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  const targetYear = d.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  // Last day of the target month
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  return new Date(
    targetYear,
    normalizedMonth,
    day,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
};

const getMonthDates = (monthsAgo = 0) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() - monthsAgo + 1,
    0,
    23,
    59,
    59,
  );
  return { start, end };
};

// ─── Financial-aggregation conventions ────────────────────────────────────
//
// Categories that appear on `FinancialTransaction` with `type: 'expense'` but
// are NOT real operating expenses. Each category here is double-bookkept in
// another collection (ProfitDistribution, Investment, etc.) and must be
// excluded from operating-expense rollups to avoid double-counting in:
//   • P&L net income          (subtracts expenses AND distributions)
//   • Balance sheet equity    (retained earnings = revenue − opex − payouts)
//   • Dashboard expense tile
//   • Branch summary expenses
//
// Keep this list in lockstep with every place that subtracts opex from cash.
const DISTRIBUTION_SHADOW_EXPENSE_CATEGORIES = [
  'profit_distribution', // regular + share + saving profit distributions
  'saving_profit',       // legacy alias still emitted by some code paths
  'share_profit',        // defensive — if any code path drifts to this label
  'regular_profit',      // ditto
];

// Categories tracked outside operating expenses for their own reasons.
// Currently just `business_capital` (owner injections / withdrawals are equity
// flows, not P&L expenses).
const NON_OPEX_EXPENSE_CATEGORIES = ['business_capital'];

// One blacklist to rule them all. Use this anywhere you aggregate operating
// expenses from FinancialTransaction.
const EXCLUDED_OPEX_CATEGORIES = [
  ...DISTRIBUTION_SHADOW_EXPENSE_CATEGORIES,
  ...NON_OPEX_EXPENSE_CATEGORIES,
];

/**
 * Returns true if the given FinancialTransaction row should count toward
 * operating expenses. Excludes:
 *   • distribution-shadow categories (see above)
 *   • business capital injections/withdrawals
 *   • reversed originals (`status === 'Reversed'`)
 *   • reversal counter-entries (`originalTransaction` is set)
 *
 * Use this when filtering an already-fetched array of transactions. For
 * Mongo aggregations, use the matching `$match` filter — see
 * `opexMatchStage` below.
 */
const isOperatingExpense = (tx) => {
  if (!tx || tx.type !== 'expense') return false;
  if (tx.status === 'Reversed') return false;
  if (tx.originalTransaction) return false;
  if (EXCLUDED_OPEX_CATEGORIES.includes(tx.category)) return false;
  return true;
};

/**
 * `$match` stage filter for Mongo aggregations that compute operating
 * expenses from FinancialTransaction. Spread it into your match clause:
 *
 *   { $match: { ...query, date: dateFilter, ...opexMatchStage() } }
 */
const opexMatchStage = () => ({
  type: 'expense',
  category: { $nin: EXCLUDED_OPEX_CATEGORIES },
  status: { $ne: 'Reversed' },
  originalTransaction: { $in: [null, undefined] },
});

module.exports = {
  calculatePercentageChange,
  getMonthDates,
  addMonthsSafe,
  DISTRIBUTION_SHADOW_EXPENSE_CATEGORIES,
  NON_OPEX_EXPENSE_CATEGORIES,
  EXCLUDED_OPEX_CATEGORIES,
  isOperatingExpense,
  opexMatchStage,
};
