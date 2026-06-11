/**
 * Centralised money math.
 *
 * Every balance/amount in FinFlo is stored as a whole-rupee `Number`. PKR has no
 * circulating minor unit, so the rounding boundary lives HERE, in one place,
 * instead of being re-derived with ad-hoc `Math.round` / `Math.ceil` / `toFixed`
 * calls scattered across the financial engine (which is what let fractional
 * rupees drift into the data and forced the one-off `fix-precision.js` repair).
 *
 * Rule: round half-up to the nearest whole rupee (`Math.round`). This matches the
 * existing live arithmetic in amortizationUtils / loanRepaymentService, so routing
 * those calls through here is behaviour-preserving. Do interest/profit math in
 * floats, then collapse to a rupee at the boundary with these helpers.
 */

/**
 * Round a value to whole rupees (round half-up).
 * @param {number} n
 * @returns {number} integer rupees
 * @throws {TypeError} if `n` is not a finite number
 */
const roundMoney = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) {
    throw new TypeError(`roundMoney expected a finite number, got: ${n}`);
  }
  return Math.round(num);
};

/**
 * Sum amounts and round the result to whole rupees.
 * @param {...number} amounts
 * @returns {number} integer rupees
 */
const addMoney = (...amounts) =>
  roundMoney(amounts.reduce((sum, a) => sum + Number(a), 0));

/**
 * Subtract amounts from a base and round the result to whole rupees.
 * @param {number} base
 * @param {...number} amounts
 * @returns {number} integer rupees
 */
const subMoney = (base, ...amounts) =>
  roundMoney(amounts.reduce((acc, a) => acc - Number(a), Number(base)));

/**
 * Split a total into `parts` whole-rupee portions whose sum equals the rounded
 * total EXACTLY — no rupee is ever invented or lost. The residual from integer
 * division lands in the LAST portion, mirroring the "last installment absorbs the
 * rounding residual" trick already used in amortizationUtils so a schedule's
 * portions reconcile to the loan total. This is the exact class of drift behind
 * the profit-distribution and amortization residual bugs.
 * @param {number} total
 * @param {number} parts positive integer
 * @returns {number[]} array of `parts` integers summing to `roundMoney(total)`
 * @throws {RangeError} if `parts` is not a positive integer
 */
const splitMoney = (total, parts) => {
  const t = roundMoney(total);
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError(
      `splitMoney expected a positive integer parts count, got: ${parts}`,
    );
  }
  const base = Math.floor(t / parts);
  const portions = new Array(parts).fill(base);
  // Last portion absorbs the residual so the portions reconcile to `t` exactly.
  portions[parts - 1] = t - base * (parts - 1);
  return portions;
};

/**
 * Guard: a valid stored money value is a finite, non-negative whole rupee.
 * @param {*} n
 * @returns {boolean}
 */
const isMoney = (n) => Number.isInteger(n) && n >= 0;

module.exports = { roundMoney, addMoney, subMoney, splitMoney, isMoney };
