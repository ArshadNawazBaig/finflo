// Canonical transaction direction — the single source of truth for whether a
// transaction is a credit (inflow, raises the balance, shown with `+`) or a
// debit (outflow, lowers the balance, shown with `-`).
//
// This mirrors the server's sign convention in
// `memberController.calculateWeightedAverageBalance`, so the UI sign always
// agrees with the actual `balanceAfter` movement. Previously each component
// re-declared its own `isCredit` list and they drifted: e.g. `loan_disbursement`
// credits the wallet on the server but rendered as a debit (`-`) in several
// views. Add a new transaction type here once instead of in every component.

// --- Member wallet perspective (Investment + unified activity feed) ---
// Types that RAISE the member's balance. The activity feed maps profit
// distributions to type `deposit` and repayments / goal allocations to
// `withdrawal`, so those resolve correctly through these sets too.
export const MEMBER_INFLOW_TYPES = new Set([
  'deposit',
  'transfer_receive',
  'external_receive',
  'p2p_receive',
  'loan_disbursement',
  'profit',
]);

// Types that LOWER the member's balance. Kept explicit (rather than "anything
// that isn't an inflow") so cash-flow charts can skip unknown/neutral rows
// instead of mis-bucketing them as outflow.
export const MEMBER_OUTFLOW_TYPES = new Set([
  'withdrawal',
  'transfer_send',
  'external_send',
  'p2p_send',
]);

// --- Business-share perspective (BusinessShare model) ---
export const SHARE_INFLOW_TYPES = new Set(['share_deposit', 'share_profit']);

// --- Business-books perspective (FinancialTransaction ledger) ---
// The ledger's own sign convention (opposite of the member's for some rows,
// e.g. profit distribution is an `expense` to the business).
export const LEDGER_INFLOW_TYPES = new Set(['income', 'credit']);

const INFLOW_SETS = {
  member: MEMBER_INFLOW_TYPES,
  share: SHARE_INFLOW_TYPES,
  ledger: LEDGER_INFLOW_TYPES,
};

/**
 * Whether a transaction is a credit (inflow, `+`) for the given perspective.
 * @param {string} type - the transaction `type`.
 * @param {'member'|'share'|'ledger'} [perspective='member']
 * @returns {boolean}
 */
export const isCreditType = (type, perspective = 'member') =>
  INFLOW_SETS[perspective]?.has(type) ?? false;
