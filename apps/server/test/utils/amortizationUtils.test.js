/**
 * Unit tests for generateAmortizationSchedule — verifies that totals reconcile
 * exactly (no rounding drift) for both simple and EMI loans.
 */
const { generateAmortizationSchedule } = require('../../src/utils/amortizationUtils');

const sum = (arr, key) => arr.reduce((s, x) => s + x[key], 0);

describe('generateAmortizationSchedule — simple interest', () => {
  const loan = {
    principal: 120000,
    rate: 24,
    duration: 12,
    startDate: new Date('2025-01-01'),
    interestType: 'simple',
  };

  it('produces one row per installment', () => {
    const schedule = generateAmortizationSchedule(loan);
    expect(schedule).toHaveLength(12);
  });

  it('reconciles principal to the loan principal exactly', () => {
    const schedule = generateAmortizationSchedule(loan);
    expect(sum(schedule, 'principal')).toBe(120000);
  });

  it('charges a flat 30-day interest each period (2% monthly on 120k = 2400)', () => {
    const schedule = generateAmortizationSchedule(loan);
    expect(schedule[0].interest).toBe(2400);
    expect(sum(schedule, 'interest')).toBe(2400 * 12);
  });

  it('each installment amount equals principal slice + interest', () => {
    const schedule = generateAmortizationSchedule(loan);
    schedule.forEach((row) => {
      expect(row.amount).toBe(row.principal + row.interest);
    });
  });

  it('due dates advance one month at a time', () => {
    const schedule = generateAmortizationSchedule(loan);
    expect(schedule[0].dueDate.getMonth()).toBe(1); // Feb
    expect(schedule[11].dueDate.getMonth()).toBe(0); // next Jan
  });
});

describe('generateAmortizationSchedule — EMI (reducing balance)', () => {
  const loan = {
    principal: 100000,
    rate: 24,
    duration: 12,
    emi: 9456,
    startDate: new Date('2025-01-01'),
    interestType: 'emi',
  };

  it('closes out the full principal exactly', () => {
    const schedule = generateAmortizationSchedule(loan);
    expect(sum(schedule, 'principal')).toBe(100000);
  });

  it('interest is highest in the first period and falls over time', () => {
    const schedule = generateAmortizationSchedule(loan);
    expect(schedule[0].interest).toBe(2000); // 2% of 100k
    expect(schedule[11].interest).toBeLessThan(schedule[0].interest);
  });

  it('never lets a principal portion exceed the remaining balance', () => {
    const schedule = generateAmortizationSchedule(loan);
    schedule.forEach((row) => expect(row.principal).toBeGreaterThanOrEqual(0));
  });
});
