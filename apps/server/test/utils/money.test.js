/**
 * Unit tests for the centralised money math (utils/money.js). Money is 2 dp
 * (rupees + paisa). The key invariant is that splitMoney never invents or loses
 * a paisa — the drift behind the profit-distribution / amortization bugs.
 */
const {
  roundMoney,
  addMoney,
  subMoney,
  splitMoney,
  isMoney,
} = require('../../src/utils/money');

describe('roundMoney', () => {
  it('rounds half-up to 2 decimal places', () => {
    expect(roundMoney(2400.4)).toBe(2400.4);
    expect(roundMoney(2400.005)).toBe(2400.01);
    expect(roundMoney(2400.004)).toBe(2400);
    expect(roundMoney(2400)).toBe(2400);
  });

  it('collapses sub-paisa float drift', () => {
    expect(roundMoney(99.999999)).toBe(100);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3); // 0.30000000000000004 → 0.30
  });

  it('throws on non-finite input', () => {
    expect(() => roundMoney(NaN)).toThrow(TypeError);
    expect(() => roundMoney(Infinity)).toThrow(TypeError);
    expect(() => roundMoney(undefined)).toThrow(TypeError);
  });
});

describe('addMoney / subMoney', () => {
  it('sums then rounds to 2 dp', () => {
    expect(addMoney(33.33, 33.33, 33.34)).toBe(100);
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(addMoney()).toBe(0);
  });

  it('subtracts amounts from a base then rounds to 2 dp', () => {
    expect(subMoney(100, 33.33, 33.33)).toBe(33.34);
    expect(subMoney(100.6, 0.3)).toBe(100.3);
  });
});

describe('splitMoney', () => {
  it('reconciles to the rounded total exactly, residual in the last part', () => {
    expect(splitMoney(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(splitMoney(120000, 12)).toEqual(Array(12).fill(10000));
  });

  it('never invents or loses a paisa across N parts', () => {
    for (let cents = 0; cents <= 100000; cents += 777) {
      const total = cents / 100;
      for (let parts = 1; parts <= 13; parts++) {
        const portions = splitMoney(total, parts);
        expect(portions).toHaveLength(parts);
        // every portion is a clean 2 dp value
        expect(portions.every((p) => isMoney(p))).toBe(true);
        // sum reconciles to the rounded total exactly (compare in paisa)
        const sumPaisa = portions.reduce((s, p) => s + Math.round(p * 100), 0);
        expect(sumPaisa).toBe(Math.round(roundMoney(total) * 100));
      }
    }
  });

  it('rounds the total before splitting', () => {
    // 100.005 rounds to 100.01, split two ways → 50.00 + 50.01
    expect(splitMoney(100.005, 2)).toEqual([50, 50.01]);
  });

  it('throws on a non-positive or non-integer parts count', () => {
    expect(() => splitMoney(100, 0)).toThrow(RangeError);
    expect(() => splitMoney(100, -2)).toThrow(RangeError);
    expect(() => splitMoney(100, 2.5)).toThrow(RangeError);
  });
});

describe('isMoney', () => {
  it('accepts finite, non-negative values with at most 2 decimals', () => {
    expect(isMoney(0)).toBe(true);
    expect(isMoney(12345)).toBe(true);
    expect(isMoney(12.5)).toBe(true);
    expect(isMoney(12.55)).toBe(true);
  });

  it('rejects >2-decimal, negative, or non-numeric values', () => {
    expect(isMoney(12.555)).toBe(false);
    expect(isMoney(-1)).toBe(false);
    expect(isMoney(NaN)).toBe(false);
    expect(isMoney('100')).toBe(false);
    expect(isMoney(null)).toBe(false);
  });
});
