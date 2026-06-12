/**
 * Centralised money math.
 *
 * Money in FinFlo is stored as a `Number` with **2 decimal places** (rupees and
 * paisa). The rounding boundary lives HERE, in one place, instead of being
 * re-derived with ad-hoc `Math.round` / `toFixed` calls scattered across the
 * financial engine — doing interest/profit math in floats and then collapsing to
 * 2 dp at the boundary with these helpers is what keeps sub-paisa float drift
 * (e.g. 0.1 + 0.2 = 0.30000000000000004) from leaking into stored balances.
 *
 * Rule: round half-up to 2 decimal places. The small `Number.EPSILON` nudge
 * keeps values that land a hair under a .xx5 boundary from rounding the wrong
 * way due to binary float representation.
 *
 * NOTE: perfectly-exact money would mean integer-paisa or Decimal128 storage.
 * We deliberately keep `Number` + consistent 2 dp rounding (pragmatic, no
 * data/serialisation migration); the guardrail setter below makes a >2 dp value
 * impossible to persist.
 */

const SCALE = 100; // 2 decimal places (paisa)

/**
 * Round a value to 2 decimal places (rupees + paisa), half-up.
 * @param {number} n
 * @returns {number}
 * @throws {TypeError} if `n` is not a finite number
 */
const roundMoney = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) {
    throw new TypeError(`roundMoney expected a finite number, got: ${n}`);
  }
  // Sign-aware so negatives round symmetrically; EPSILON guards the .xx5 edge.
  const sign = num < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(num) + Number.EPSILON) * SCALE)) / SCALE;
};

/**
 * Sum amounts and round the result to 2 dp.
 * @param {...number} amounts
 * @returns {number}
 */
const addMoney = (...amounts) =>
  roundMoney(amounts.reduce((sum, a) => sum + Number(a), 0));

/**
 * Subtract amounts from a base and round the result to 2 dp.
 * @param {number} base
 * @param {...number} amounts
 * @returns {number}
 */
const subMoney = (base, ...amounts) =>
  roundMoney(amounts.reduce((acc, a) => acc - Number(a), Number(base)));

/**
 * Split a total into `parts` portions (each 2 dp) whose sum equals the rounded
 * total EXACTLY — no paisa is ever invented or lost. Computed in integer paisa
 * to avoid float drift; the residual lands in the LAST portion (mirroring the
 * amortization "last installment absorbs the residual" trick).
 * @param {number} total
 * @param {number} parts positive integer
 * @returns {number[]} array of `parts` numbers summing to `roundMoney(total)`
 * @throws {RangeError} if `parts` is not a positive integer
 */
const splitMoney = (total, parts) => {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError(
      `splitMoney expected a positive integer parts count, got: ${parts}`,
    );
  }
  const totalPaisa = Math.round(roundMoney(total) * SCALE);
  const basePaisa = Math.floor(totalPaisa / parts);
  const portions = new Array(parts).fill(basePaisa);
  portions[parts - 1] = totalPaisa - basePaisa * (parts - 1);
  return portions.map((p) => p / SCALE);
};

/**
 * Guard: a valid stored money value is finite, non-negative, and has at most 2
 * decimal places.
 * @param {*} n
 * @returns {boolean}
 */
const isMoney = (n) =>
  typeof n === 'number' &&
  Number.isFinite(n) &&
  n >= 0 &&
  Math.abs(n * SCALE - Math.round(n * SCALE)) < 1e-6;

/**
 * Mongoose setter that rounds a money value to 2 dp AT REST — the structural
 * guarantee that a value with more than 2 decimal places can never be persisted,
 * even if some future code path forgets to round. Lenient by design:
 * null/undefined and non-finite values pass straight through so document
 * defaults, clears, and Mongoose's own Number cast/validation still behave
 * normally. Mongoose does NOT run setters on data loaded from the DB, so existing
 * stored values are untouched; this only governs assignment/create/save.
 * @param {*} v
 * @returns {*}
 */
const moneySetter = (v) => {
  if (v === null || v === undefined) return v;
  const n = Number(v);
  return Number.isFinite(n) ? roundMoney(n) : v;
};

/**
 * Install the money rounding setter on the given schema paths. Unknown paths are
 * skipped (so a stray/renamed name is a harmless no-op, never a crash).
 * @param {import('mongoose').Schema} schema
 * @param {string[]} paths money field paths (dot notation for nested)
 * @returns {import('mongoose').Schema} the same schema (chainable)
 */
const applyMoneySetter = (schema, paths) => {
  for (const p of paths) {
    const path = schema.path(p);
    if (path) path.set(moneySetter);
  }
  return schema;
};

module.exports = {
  roundMoney,
  addMoney,
  subMoney,
  splitMoney,
  isMoney,
  moneySetter,
  applyMoneySetter,
};
