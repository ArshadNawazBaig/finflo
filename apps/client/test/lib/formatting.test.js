/** lib/utils — currency / number / date / CNIC formatting helpers. */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatCurrency,
  formatFullCurrency,
  formatCompactValue,
  capitalize,
  formatDate,
  formatCNIC,
} from '@/lib/utils';

beforeEach(() => localStorage.clear());

describe('formatCurrency', () => {
  it('prefixes the default Rs. symbol and shows up to 2 decimals (paisa)', () => {
    expect(formatCurrency(1234.6)).toBe('Rs.1,234.6');
    expect(formatCurrency(1234.56)).toBe('Rs.1,234.56');
    expect(formatCurrency(1234.567)).toBe('Rs.1,234.57'); // rounds to 2 dp
    expect(formatCurrency(1234)).toBe('Rs.1,234'); // no forced .00
  });

  it('handles negatives and nullish input', () => {
    expect(formatCurrency(-5000)).toBe('-Rs.5,000');
    expect(formatCurrency(null)).toBe('Rs.0');
    expect(formatCurrency(undefined)).toBe('Rs.0');
  });

  it('uses the business currency from localStorage when present', () => {
    localStorage.setItem('user', JSON.stringify({ currency: '$' }));
    expect(formatFullCurrency(2500)).toBe('$2,500');
  });
});

describe('formatCompactValue', () => {
  it('scales to K / M / B / T and drops a trailing .0', () => {
    expect(formatCompactValue(1000)).toBe('1K');
    expect(formatCompactValue(1500)).toBe('1.5K');
    expect(formatCompactValue(12_000_000)).toBe('12M');
    expect(formatCompactValue(2_500_000_000)).toBe('2.5B');
  });

  it('keeps small numbers as-is and preserves sign', () => {
    expect(formatCompactValue(999)).toBe('999');
    expect(formatCompactValue(-1500)).toBe('-1.5K');
    expect(formatCompactValue(null)).toBe('0');
  });
});

describe('capitalize', () => {
  it('title-cases each word', () => {
    expect(capitalize('john DOE')).toBe('John Doe');
    expect(capitalize('')).toBe('');
  });
});

describe('formatDate', () => {
  it('formats to DD Mon YYYY and guards null', () => {
    expect(formatDate('2026-06-10')).toBe('10 Jun 2026');
    expect(formatDate(null)).toBe('N/A');
  });
});

describe('formatCNIC', () => {
  it('inserts dashes in the 5-7-1 pattern', () => {
    expect(formatCNIC('3520212345673')).toBe('35202-1234567-3');
  });

  it('formats partial input progressively and strips non-digits', () => {
    expect(formatCNIC('35202')).toBe('35202');
    expect(formatCNIC('352021')).toBe('35202-1');
    expect(formatCNIC('35202-1234')).toBe('35202-1234');
  });
});
