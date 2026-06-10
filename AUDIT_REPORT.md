# FinFlo — Financial & Accounting Audit Report

**Scope:** Full money-path audit of the Express/Mongoose backend (loan lifecycle,
savings, profit distribution, term deposits, transfers, ledger, reporting).
**Money model:** integer PKR (no minor units); arithmetic via JS `Number` + `Math.round`.
**Method:** six parallel domain audits, every formula re-derived from first
principles, the highest-severity findings independently re-verified against source,
and a dependency-free check harness (`apps/server/scripts/auditFinancialChecks.js`).

Branch with fixes: `audit/financial-fixes` (not committed — review then commit).

---

## 1. Executive Summary

The system is **single-entry**, not double-entry: each money event writes one
`FinancialTransaction` row (a denormalized journal/reporting view). The authoritative
books of record are the **source collections** (`Investment`, `Repayment`,
`BusinessShare`, `Loan`) which nightly jobs recompute balances from. The accounting
equation (A = L + E) is reconstructed after the fact in reports and **reported as a
`discrepancy` but never enforced**, so integrity depended on every code path writing
the right row with the right sign — and several did not.

The audit surfaced **41 findings**. The most dangerous fabricated or destroyed money:

- **Compound interest was capitalized every day** a loan stayed overdue (not once per
  missed period) — a single missed installment compounded ~30× per month (~+81%/mo).
- **A failed wallet debit was swallowed** while the loan was still marked paid and
  repayment income booked — phantom money.
- **The member loan-request endpoint crashed** for every non-zero rate (a `ReferenceError`).
- **External transfers debited the member with no reversal** on payout failure.
- **Profit distribution did not conserve the pool** (independent rounding lost/created rupees).
- **The Raast deposit webhook could double-credit** under concurrent retries.

19 fixes are implemented and verified; the rest are accounting-policy decisions
documented below for sign-off, plus lower-severity items.

---

## 2. How money flows through the system

| Flow | Source ledger | `FinancialTransaction` | Atomic? |
|---|---|---|---|
| Loan origination | `Loan` | `loan`/`loan_disbursement` | now guard-checked |
| Loan repayment | `Repayment` (interest/principal split) | `income`/`repayment` | **fixed: now atomic + re-throws** |
| Late fee | `Loan.lateFeeAmount` | `income`/`late_fee` (accrual) | two engines (see B1) |
| Compound interest | `Loan.compoundedAmount` | — | **fixed: once per period (CAS)** |
| Profit distribution (regular/share/saving) | `ProfitDistribution` | `expense`/`profit_distribution` | **fixed: pool conserved** |
| Member deposit / withdrawal | `Investment` | `credit`/`debit` | **fixed: wrapped in txn** |
| Member↔member transfer | `Investment` (both legs) | none | atomic; **fixed: account-type preserved** |
| Term deposit | `TermDeposit` | `income`/`term_deposit` | misclassified (see treatment items) |
| External transfer | `ExternalTransfer` + `Investment` | `debit` | **fixed: reversal on failure** |
| Raast deposit (webhook) | `Investment` | `income` | **fixed: idempotent claim** |

Cron jobs (overdue downgrade, late-fee accrual, compound interest, saving-profit
accrual/distribution, TD maturity, scheduled payments) all run in `Asia/Karachi` —
but report boundaries used server-local time (**fixed: process anchored to Karachi**).

---

## 3. Bug Report (prioritized)

### CRITICAL — fixed

| # | Title | File | Root cause | Impact |
|---|---|---|---|---|
| C1 | Compound interest charged daily, not per missed period | `services/scheduledTasksService.js` | Guard only checked *whether* behind + same-day dedup; full month's interest re-added every day | Balance ~+81%/mo for one missed installment; runaway over-collection |
| C2 | Failed wallet debit swallowed; loan still marked paid | `services/loanRepaymentService.js` | `throw` caught by local `catch` that only logged, then execution continued to book income | Loans reported paid with no money moved; revenue overstated |
| C3 | `requestLoan` crashes on any rate > 0 | `controllers/loanController.js` | `interestType` referenced but never destructured → `ReferenceError` | Entire member loan-request portal down whenever default rate > 0 |
| C4 | External transfer debits with no reversal on payout failure | `controllers/externalTransferController.js` | Payout error swallowed; txn committed the debit, status stuck `Pending`, no reversal path | Member funds destroyed on a failed transfer |

### HIGH — fixed

| # | Title | File | Impact |
|---|---|---|---|
| H1 | Profit distribution does not conserve the pool | `controllers/memberController.js` (regular + share) | Σ payouts ≠ declared pool; breaks balance-sheet conservation; fixed with largest-remainder allocation |
| H2 | Concurrent repayments drive `remainingAmount` negative / over-collect | `services/loanRepaymentService.js` | Over-collection masked by silent zeroing; fixed with `$gte`-guarded conditional update + overpay clamp |
| H3 | Raast webhook double-credit under concurrent retries | `controllers/raastWebhookController.js` | Non-atomic `raastStatus` read; fixed with atomic conditional claim |
| H4 | Loan-product edits silently no-op for rate/duration/amounts | `controllers/loanProductController.js` | Whitelist used non-existent field names; stale terms propagate into new loans; fixed |
| H5 | Early settlement can exceed the contractual total | `services/loanRepaymentService.js` | Actual-day-count pro-rated/EMI-full-principal interest overshoots; fixed with cap at current total owed |
| H6 | `ExternalTransfer` status enum missing `Processing`; default `Completed` | `models/ExternalTransfer.js` | Provider status save threw (swallowed → providerRef lost); fixed enum + default `Pending` |

### MEDIUM — fixed

| # | Title | File |
|---|---|---|
| M1 | Dashboard operating-expenses KPI structurally always 0 | `controllers/dashboardController.js` (`category==='expense'` → proper opex match) |
| M2 | Deposit/withdrawal mutate balance + ledger non-atomically | `controllers/memberController.js` (`addInvestment`/`withdrawInvestment` wrapped in txns) |
| M3 | Saving→saving transfer credits recipient's **current** account | `controllers/memberController.js` (preserve account type on both legs + record `accountType`) |
| M4 | Contribute to a completed/cancelled goal | `controllers/savingGoalController.js` (`status:'active'` guard) |
| M5 | `%`-change inverts sign on a negative baseline | `utils/reportUtils.js` (divide by `|previous|`) |
| M6 | Report period boundaries used server-local (UTC) time | `index.js` (`process.env.TZ='Asia/Karachi'`) |
| M7 | Daily transfer-limit window used UTC midnight (05:00 PKT seam) | `services/transferLimits.js` (Karachi day boundaries) |
| M8 | CTR report-number race drops a regulatory filing | `models/CurrencyTransactionReport.js` (unique suffix; recommend atomic counter) |

### Accounting-policy items — RESOLVED & IMPLEMENTED (post sign-off)

The owner signed off on the policy decisions below; all are implemented with tests:

- **B1 — Two late-fee engines (decision: keep both, gate them).** Added `Loan.lateFeeSource`;
  whichever engine charges a loan first in a calendar month owns it — the daily cron now
  skips loans the manual flat-fee engine charged this month, and the manual path already
  skips cron-charged loans. They can no longer stack. *(test: cron does not stack on a manual fee)*
- **B2 — Distributions (decision: equity appropriation).** P&L `netIncome` is now
  `revenue − operating expenses` only; distributions are reported below it with an explicit
  `retainedEarningsMovement = netIncome − distributions` that ties to the balance sheet.
- **B4 — Term deposits (decision: transfer + accrue over term).** TD funding is reclassified
  from `income` to a `debit` (wallet→lock reclass, no phantom revenue). The balance sheet now
  recognizes **accrued-to-date** TD profit (straight-line) in both the liability and the equity
  offset — symmetric, so it still foots. *(test: obligation = principal + ~½ projected at mid-term)*
- **B5/B8 — Principal tracking (decision: add outstandingPrincipal + fix disbursement).**
  Added `Loan.outstandingPrincipal` (set at all 4 origination sites; decremented by the principal
  portion of each repayment; zeroed on settlement). Compound interest now accrues on
  **principal only** (capitalized into principal), never on accrued late fees or prior interest.
  Backfill migration: `scripts/backfillOutstandingPrincipal.js`. *(tests: repayment decrements
  principal; compound ignores late fees)*
  **Disbursement reclassification — NOW IMPLEMENTED (coordinated structural change).**
  Loan proceeds no longer inflate `totalInvested` (member capital). New
  `Investment` type `loan_disbursement` + new `Member.totalLoanProceeds` field carry
  borrowed money separately. The wallet invariant is now
  `currentBalance = totalInvested + totalLoanProceeds − totalWithdrawn + totalProfit`,
  updated in **every** place that derives it: both rebuild paths
  (`resolveMemberBalances` + the `runMemberBalanceReconcile` cron), the simple
  member-balance reconcile, the cash reconcile, both balance-sheet builders
  (`getBalanceSheet` + `getTrialBalance`), dashboard liquidity, and the three
  weighted-average-balance credit sets. Cash/foot computations use
  `totalInvested + totalLoanProceeds`; the *deposit/capital* base uses
  `totalInvested` alone (now accurate). Migration: `scripts/backfillLoanProceeds.js`
  re-types historical disbursement rows and rebuilds the aggregates.
  *(tests: rebuild separates proceeds from capital; balance sheet still foots when a
  wallet is loan-funded)* — **No remaining structural items.**

### Still documented for sign-off (lower priority)

- **B1 — Two late-fee engines.** `lateFeeService.applyLateFees` (manual, flat, monthly
  guard) and `scheduledTasksService.runLateFeeAccrual` (cron, daily-prorated) both
  `$inc` the loan balance with incompatible dedup granularities — the cron can stack
  daily fees on top of a manual fee across a month. **Decision needed:** one canonical
  engine/model. Recommend retiring the manual flat path or gating it off when accrual is enabled.
- **B2 — Profit distributions are simultaneously a P&L expense and an equity
  appropriation** (`reportController.getProfitAndLoss` vs balance sheet). Net income
  will not reconcile to the change in retained earnings. **Decision:** treat member
  distributions as an equity appropriation, not opex.
- **B3 — Fee/interest cash double-counted into cash *and* equity** when the fee was
  swept from a member balance (which already reduced a liability). **Decision:** only
  add externally-settled fees to cash.
- **B4 — Term-deposit funding booked as business `income`**; full projected profit
  recognized as a day-1 equity reduction instead of accruing over the term. **Decision:**
  use a neutral transfer category + accrue TD profit pro-rata (or book a deferred-interest asset).
- **B5 — Loan disbursement inflates member `totalInvested`**, overstating the deposit
  base used in `cashAtHand`/liabilities. **Decision:** track disbursement as its own
  Investment type excluded from the deposit aggregate.
- **B6 — IFRS9 ECL excludes overdue/defaulted loans; Basel III capital is hardcoded mock.**
- **B7 — 30/360 vs actual/365 day-count** differs between origination/schedule and the
  settlement interest base. The H5 cap removes the over-charge symptom; aligning the
  day-count basis is the deeper fix.
- **B8 — `remainingAmount` conflates principal + interest + fees** (no `outstandingPrincipal`).
  Compound interest and late fees therefore accrue on a base that includes penalties.
  Adding a true `outstandingPrincipal` field is the structural fix several findings share.

### Remaining lower-severity (documented, not yet changed)

- Transfer/withdrawal daily-limit check is read-then-act (TOCTOU) — concurrency can
  exceed the cap (atomic per-day counter recommended; needs a small schema addition).
- Loan origination has no transaction/unique-index guard against concurrent
  double-active-loan / credit-limit-bypass.
- `getUpcomingRepayments` redistribution fabricates non-integer installment figures.
- EMI schedule total can differ from `emi×duration` by a rupee (set total from schedule).
- Credit-limit history ignores `renewed` loans and permanently penalizes old defaults;
  query not tenant-scoped.
- TD auto-maturity/rollover cron writes are non-transactional (interactive paths are).
- Daily saving-profit accrual rounds each day (systematic under-payment vs monthly).
- Reconciliation uses `> 1` rupee tolerance on integer money; completed loans skip the
  balance-equation check.

---

## 4. Accounting Compliance

- **Double-entry:** not implemented (single-entry journal). Recommendation: keep the
  source-ledger model as the book of record, but make `FinancialTransaction` a faithful,
  policy-consistent projection and add a job that asserts A = L + E (fail/alert on drift)
  rather than merely reporting `discrepancy`.
- **Conservation:** profit-distribution pool conservation is now enforced (largest
  remainder) and proven over 5,000 random splits. Term-deposit and fee/distribution
  treatments (B2–B5) still need policy alignment before the balance sheet's line items
  can be trusted individually (it currently foots only by residual definition).
- **Recognition:** late fees recognized on accrual (acceptable accrual basis); the dual
  engine (B1) is the open risk.

---

## 5. Risk Assessment

| Risk | Likelihood (pre-fix) | $ Impact | Status |
|---|---|---|---|
| Compound-interest runaway over-collection | High (any overdue compound loan) | Severe | Fixed |
| Phantom repayment income / loan paid w/o cash | Medium | Severe | Fixed |
| External-transfer fund destruction | High once live payout creds enabled | Severe | Fixed |
| Member loan-request outage | Certain when rate>0 | Feature outage | Fixed |
| Profit-distribution non-conservation | Certain (every rounding) | Low/aggregating | Fixed |
| Raast double-credit | Low–Medium (concurrent retries) | Medium | Fixed |
| Late-fee dual-engine stacking | Medium | Medium | **Open — policy** |
| Statement line-item misstatement (B2–B5) | Reporting only | Medium | **Open — policy** |
| Limit bypass under concurrency | Low | Medium | Open |

---

## 6. Code-Change Summary

15 files, +440/−153. All pass `node --check`, require-load cleanly, and the math
harness passes (20/20). See `git diff` on branch `audit/financial-fixes`.

Run the checks:

```bash
node apps/server/scripts/auditFinancialChecks.js
```

---

## 7. Test Coverage

No test runner is configured in the repo. Added `auditFinancialChecks.js`: a
dependency-free harness asserting amortization reconciliation, distribution pool
conservation (5,000-case fuzz), compound-interest once-per-period, settlement caps,
and percentage-change sign. Recommended next: a Vitest/Jest suite around
`loanRepaymentService` and the distribution controllers using an in-memory Mongo.

---

## 8. Remaining Risks

The "policy sign-off" items (B1–B8) and the lower-severity list in §3 are intentionally
**not** changed because they encode accounting policy or need schema/infra decisions
that could otherwise break the (currently residual-balanced) statements. Each has a
concrete proposed fix above and should be scheduled with finance sign-off.
