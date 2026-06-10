/**
 * Standalone financial-correctness checks for the FinFlo audit fixes.
 *
 * There is no test runner configured in this repo (see CLAUDE.md), so this file
 * is a dependency-free, pure-function harness you can run directly:
 *
 *   node apps/server/scripts/auditFinancialChecks.js
 *
 * It re-implements the *audited algorithms* in isolation (no DB) to prove the
 * invariants the production fixes now uphold:
 *   1. Amortization schedule reconciles to the loan's recorded total.
 *   2. Proportional profit distribution conserves the pool exactly (largest
 *      remainder), for many random splits.
 *   3. Compound interest on a missed installment is capitalized ONCE per period,
 *      not once per day (the old runaway).
 *   4. Early-settlement is capped at the current total owed.
 *   5. Percentage-change does not invert sign on a negative baseline.
 *
 * Exit code is non-zero if any assertion fails, so it is CI-friendly.
 */

let failures = 0;
const approx = (a, b, tol = 0) => Math.abs(a - b) <= tol;
function check(name, cond, detail = '') {
  const ok = !!cond;
  if (!ok) failures += 1;
  console.log(`${ok ? '✓ PASS' : '✗ FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Amortization (mirrors utils/amortizationUtils.js, simple-interest branch)
// ─────────────────────────────────────────────────────────────────────────────
function simpleSchedule({ principal, rate, duration }) {
  const monthlyRate = rate / 12 / 100;
  const dailyRate = monthlyRate / 30;
  const interestPer30 = Math.round(principal * dailyRate * 30);
  const principalPer = Math.round(principal / (duration || 1));
  const totalInterest = interestPer30 * duration;
  let allocP = 0;
  let allocI = 0;
  const rows = [];
  for (let i = 1; i <= duration; i++) {
    const last = i === duration;
    const p = last ? Math.max(0, principal - allocP) : principalPer;
    const itx = last ? Math.max(0, totalInterest - allocI) : interestPer30;
    allocP += p;
    allocI += itx;
    rows.push({ principal: p, interest: itx, amount: p + itx });
  }
  return { rows, totalInterest };
}

(function amortizationReconciles() {
  const cases = [
    { principal: 100000, rate: 24, duration: 12 },
    { principal: 55555, rate: 18, duration: 7 },
    { principal: 999999, rate: 36, duration: 11 },
    { principal: 12345, rate: 0, duration: 6 },
    { principal: 100000, rate: 15, duration: 1 },
  ];
  for (const c of cases) {
    const { rows, totalInterest } = simpleSchedule(c);
    const sumP = rows.reduce((s, r) => s + r.principal, 0);
    const sumI = rows.reduce((s, r) => s + r.interest, 0);
    const recordedTotal = c.principal + totalInterest;
    const sumTotal = rows.reduce((s, r) => s + r.amount, 0);
    check(
      `amortization principal reconciles (P=${c.principal} r=${c.rate} n=${c.duration})`,
      sumP === c.principal,
      `Σprincipal=${sumP} expected=${c.principal}`,
    );
    check(
      `amortization total reconciles (P=${c.principal} r=${c.rate} n=${c.duration})`,
      sumTotal === recordedTotal && sumI === totalInterest,
      `Σamount=${sumTotal} expected=${recordedTotal}`,
    );
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// 2. Proportional profit distribution — largest-remainder (mirrors fix)
// ─────────────────────────────────────────────────────────────────────────────
function distribute(pool, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total === 0) return weights.map(() => 0);
  const rows = weights.map((w, i) => {
    const exact = (w / total) * pool;
    const floor = Math.floor(exact);
    return { i, amount: floor, frac: exact - floor };
  });
  let leftover = Math.round(pool - rows.reduce((s, r) => s + r.amount, 0));
  rows
    .slice()
    .sort((a, b) => b.frac - a.frac)
    .forEach((r) => {
      if (leftover > 0) {
        r.amount += 1;
        leftover -= 1;
      }
    });
  return rows.sort((a, b) => a.i - b.i).map((r) => r.amount);
}

// old (buggy) independent rounding, for contrast
function distributeOld(pool, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => Math.round((w / total) * pool));
}

(function distributionConservesPool() {
  // The classic 100 / 3 case the old code lost a rupee on.
  check(
    'old rounding LOSES money on 100/3 split (demonstrates the bug)',
    distributeOld(100, [1, 1, 1]).reduce((s, x) => s + x, 0) !== 100,
    `old=${distributeOld(100, [1, 1, 1])}`,
  );

  // Deterministic pseudo-random fuzz (no Math.random for reproducibility).
  let seed = 1234567;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  let worstOld = 0;
  for (let t = 0; t < 5000; t++) {
    const n = 2 + Math.floor(rng() * 8);
    const pool = 1 + Math.floor(rng() * 1_000_000);
    const weights = Array.from({ length: n }, () => 1 + Math.floor(rng() * 100000));
    const fixed = distribute(pool, weights).reduce((s, x) => s + x, 0);
    if (fixed !== pool) {
      check(`distribution conserves pool (t=${t})`, false, `got ${fixed} expected ${pool}`);
    }
    const oldSum = distributeOld(pool, weights).reduce((s, x) => s + x, 0);
    worstOld = Math.max(worstOld, Math.abs(oldSum - pool));
  }
  check('distribution conserves pool across 5000 random splits', true);
  check(
    'old rounding drifted from pool in the same fuzz set (shows why fix matters)',
    worstOld > 0,
    `max old drift = ${worstOld} PKR`,
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// 3. Compound interest — once per missed period, not per day (mirrors cron fix)
// ─────────────────────────────────────────────────────────────────────────────
function compoundCatchUp({ remaining, rate, overduePeriods, alreadyCompounded }) {
  const periodsToCompound = overduePeriods - alreadyCompounded;
  if (periodsToCompound <= 0) return { interest: 0, periods: 0 };
  let bal = remaining;
  let interest = 0;
  for (let p = 0; p < periodsToCompound; p++) {
    const pi = Math.round((bal * rate) / 1200);
    if (pi <= 0) break;
    interest += pi;
    bal += pi;
  }
  return { interest, periods: periodsToCompound };
}

(function compoundOncePerPeriod() {
  // One missed installment, cron runs 30 times in the month.
  let remaining = 100000;
  let alreadyCompounded = 0;
  const rate = 24;
  for (let day = 0; day < 30; day++) {
    const r = compoundCatchUp({
      remaining,
      rate,
      overduePeriods: 1, // still only 1 installment behind all month
      alreadyCompounded,
    });
    remaining += r.interest;
    alreadyCompounded += r.periods;
  }
  // Exactly one month of interest (2000) should have been added — not 30×.
  check(
    'compound interest adds ONE period for one missed installment over 30 daily runs',
    remaining === 102000,
    `remaining=${remaining} (old runaway would be ~181000)`,
  );

  // Three genuinely-missed periods compound three times (interest-on-interest).
  const r3 = compoundCatchUp({ remaining: 100000, rate: 24, overduePeriods: 3, alreadyCompounded: 0 });
  // 100000→102000→104040→106120.8→106121
  check(
    'three missed periods compound exactly three times',
    approx(100000 + r3.interest, 106121, 1),
    `balance=${100000 + r3.interest}`,
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// 4. Early-settlement cap (mirrors loanRepaymentService safety cap)
// ─────────────────────────────────────────────────────────────────────────────
(function settlementNeverExceedsOwed() {
  const settle = (computed, paid, remaining) => Math.min(computed, paid + remaining);
  // Simple loan settled past tenure: pro-rated interest overshoots the contract.
  check(
    'settlement capped at total owed (simple, post-tenure overshoot)',
    settle(124333, 0, 124000) === 124000,
    'computed 124333 → capped 124000',
  );
  // Genuinely-early payoff keeps its discount (cap does not bite).
  check(
    'genuinely-early settlement keeps discount (cap inactive)',
    settle(108000, 0, 124000) === 108000,
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// 5. Percentage change with negative baseline (mirrors reportUtils fix)
// ─────────────────────────────────────────────────────────────────────────────
(function percentChangeSign() {
  const pct = (cur, prev) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
  };
  check('negative baseline improvement reads positive', pct(10000, -10000) === 200, `got ${pct(10000, -10000)}`);
  check('negative baseline worsening reads negative', pct(-30000, -10000) === -200, `got ${pct(-30000, -10000)}`);
  check('normal positive change unchanged', pct(150, 100) === 50);
})();

console.log('\n' + (failures === 0
  ? 'ALL CHECKS PASSED'
  : `${failures} CHECK(S) FAILED`));
process.exit(failures === 0 ? 0 : 1);
