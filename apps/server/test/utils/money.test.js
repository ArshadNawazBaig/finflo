/**
 * Unit tests for the centralised money math (utils/money.js). The key invariant
 * is that splitMoney never invents or loses a rupee — the drift behind the
 * profit-distribution and amortization residual bugs.
 */
const {
  roundMoney,
  addMoney,
  subMoney,
  splitMoney,
  isMoney,
} = require('../../src/utils/money');

describe('roundMoney', () => {
  it('rounds half-up to whole rupees', () => {
    expect(roundMoney(2400.4)).toBe(2400);
    expect(roundMoney(2400.5)).toBe(2401);
    expect(roundMoney(2400)).toBe(2400);
  });

  it('collapses float drift to the nearest rupee', () => {
    expect(roundMoney(99.99999999)).toBe(100);
    expect(roundMoney(0.1 + 0.2)).toBe(0); // 0.30000000000000004
  });

  it('throws on non-finite input', () => {
    expect(() => roundMoney(NaN)).toThrow(TypeError);
    expect(() => roundMoney(Infinity)).toThrow(TypeError);
    expect(() => roundMoney(undefined)).toThrow(TypeError);
  });
});

describe('addMoney / subMoney', () => {
  it('sums then rounds to a whole rupee', () => {
    expect(addMoney(33.3, 33.3, 33.4)).toBe(100);
    expect(addMoney()).toBe(0);
  });

  it('subtracts amounts from a base then rounds', () => {
    expect(subMoney(100, 33, 33)).toBe(34);
    expect(subMoney(100.6, 0.3)).toBe(100); // 100.3 → 100
  });
});

describe('splitMoney', () => {
  it('reconciles to the rounded total exactly with the residual in the last part', () => {
    expect(splitMoney(100, 3)).toEqual([33, 33, 34]);
    expect(splitMoney(120000, 12)).toEqual(Array(12).fill(10000));
  });

  it('never invents or loses a rupee across N parts', () => {
    // Deterministic sweep over a range of totals and part counts.
    for (let total = 0; total <= 1000; total += 7) {
      for (let parts = 1; parts <= 13; parts++) {
        const portions = splitMoney(total, parts);
        expect(portions).toHaveLength(parts);
        expect(portions.every((p) => Number.isInteger(p))).toBe(true);
        expect(portions.reduce((s, p) => s + p, 0)).toBe(roundMoney(total));
      }
    }
  });

  it('rounds the total before splitting', () => {
    expect(splitMoney(100.6, 2)).toEqual([50, 51]); // rounds to 101 first
  });

  it('throws on a non-positive or non-integer parts count', () => {
    expect(() => splitMoney(100, 0)).toThrow(RangeError);
    expect(() => splitMoney(100, -2)).toThrow(RangeError);
    expect(() => splitMoney(100, 2.5)).toThrow(RangeError);
  });
});

describe('isMoney', () => {
  it('accepts finite, non-negative whole rupees', () => {
    expect(isMoney(0)).toBe(true);
    expect(isMoney(12345)).toBe(true);
  });

  it('rejects fractional, negative, or non-numeric values', () => {
    expect(isMoney(12.5)).toBe(false);
    expect(isMoney(-1)).toBe(false);
    expect(isMoney(NaN)).toBe(false);
    expect(isMoney('100')).toBe(false);
    expect(isMoney(null)).toBe(false);
  });
});
