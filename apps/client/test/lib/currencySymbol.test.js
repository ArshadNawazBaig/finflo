/**
 * lib/utils — currency-symbol resolution. getCurrencySymbol prefers the
 * admin/staff `user` object, falls back to the `memberData` object, then to
 * the "Rs." default. formatCompactCurrency prefixes the compact value with it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrencySymbol, formatCompactCurrency } from '@/lib/utils';

beforeEach(() => localStorage.clear());

describe('getCurrencySymbol', () => {
  it('defaults to Rs. when nothing is stored', () => {
    expect(getCurrencySymbol()).toBe('Rs.');
  });

  it('reads the user currency first', () => {
    localStorage.setItem('user', JSON.stringify({ currency: '$' }));
    expect(getCurrencySymbol()).toBe('$');
  });

  it('falls back to the member currency when no user is present', () => {
    localStorage.setItem('memberData', JSON.stringify({ currency: '€' }));
    expect(getCurrencySymbol()).toBe('€');
  });

  it('survives malformed JSON in storage', () => {
    localStorage.setItem('user', '{not json');
    expect(getCurrencySymbol()).toBe('Rs.');
  });
});

describe('formatCompactCurrency', () => {
  it('prefixes the symbol onto the compact value', () => {
    localStorage.setItem('user', JSON.stringify({ currency: '$' }));
    expect(formatCompactCurrency(1_500_000)).toBe('$1.5M');
  });

  it('uses Rs. and handles nullish input', () => {
    expect(formatCompactCurrency(null)).toBe('Rs.0');
  });
});
