/**
 * Unit tests for reportUtils — percentage-change sign handling, safe month math,
 * and the operating-expense classification used across every financial rollup.
 */
const {
  calculatePercentageChange,
  addMonthsSafe,
  getMonthDates,
  isOperatingExpense,
  opexMatchStage,
  EXCLUDED_OPEX_CATEGORIES,
} = require('../../src/utils/reportUtils');

describe('calculatePercentageChange', () => {
  it('computes a normal positive change', () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });

  it('computes a normal negative change', () => {
    expect(calculatePercentageChange(80, 100)).toBe(-20);
  });

  it('returns 100 when previous is 0 and current is positive', () => {
    expect(calculatePercentageChange(500, 0)).toBe(100);
  });

  it('returns 0 when both are 0', () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });

  it('divides by |previous| so an improvement off a NEGATIVE base is positive', () => {
    // -10k → +10k is a +200% improvement, not -200%.
    expect(calculatePercentageChange(10000, -10000)).toBe(200);
  });

  it('rounds to one decimal place', () => {
    expect(calculatePercentageChange(101, 99)).toBe(2);
  });
});

describe('addMonthsSafe', () => {
  it('does not roll Jan 31 + 1 month into March', () => {
    const d = addMonthsSafe(new Date(2025, 0, 31), 1); // Jan 31 2025
    expect(d.getMonth()).toBe(1); // February
    expect(d.getDate()).toBe(28); // clamped, not Mar 2/3
  });

  it('lands on Feb 29 in a leap year', () => {
    const d = addMonthsSafe(new Date(2024, 0, 31), 1);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(29);
  });

  it('crosses a year boundary correctly', () => {
    const d = addMonthsSafe(new Date(2025, 10, 15), 3); // Nov 15 + 3 → Feb 15 2026
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(15);
  });
});

describe('getMonthDates', () => {
  it('returns the first and last instant of the current month', () => {
    const { start, end } = getMonthDates(0);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    // end is the last day of the month (next month day 0)
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    expect(end.getDate()).toBe(lastDay);
  });
});

describe('isOperatingExpense', () => {
  it('accepts a plain operating expense', () => {
    expect(isOperatingExpense({ type: 'expense', category: 'rent' })).toBe(true);
  });

  it('rejects non-expense rows', () => {
    expect(isOperatingExpense({ type: 'income', category: 'rent' })).toBe(false);
  });

  it('rejects reversed originals and reversal counter-entries', () => {
    expect(isOperatingExpense({ type: 'expense', category: 'rent', status: 'Reversed' })).toBe(false);
    expect(isOperatingExpense({ type: 'expense', category: 'rent', originalTransaction: 'x' })).toBe(false);
  });

  it('rejects distribution-shadow and business-capital categories', () => {
    expect(isOperatingExpense({ type: 'expense', category: 'profit_distribution' })).toBe(false);
    expect(isOperatingExpense({ type: 'expense', category: 'business_capital' })).toBe(false);
  });

  it('handles null/undefined safely', () => {
    expect(isOperatingExpense(null)).toBe(false);
    expect(isOperatingExpense(undefined)).toBe(false);
  });
});

describe('opexMatchStage / EXCLUDED_OPEX_CATEGORIES', () => {
  it('builds a $match that excludes the blacklist and reversals', () => {
    const stage = opexMatchStage();
    expect(stage.type).toBe('expense');
    expect(stage.category.$nin).toEqual(EXCLUDED_OPEX_CATEGORIES);
    expect(stage.status.$ne).toBe('Reversed');
    expect(stage.originalTransaction.$in).toContain(null);
  });

  it('blacklist covers both distribution shadows and business capital', () => {
    expect(EXCLUDED_OPEX_CATEGORIES).toContain('profit_distribution');
    expect(EXCLUDED_OPEX_CATEGORIES).toContain('business_capital');
  });
});
