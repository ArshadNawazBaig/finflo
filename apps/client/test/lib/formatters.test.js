/**
 * lib/formatters — the functions newly centralised here (the relocated
 * currency/CNIC helpers are covered by formatting.test.js + currencySymbol.test.js).
 * Focus: formatDateTime, formatNotificationTime, formatPhoneNumber,
 * formatAccountNumber, and the formatDate variants.
 */
import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatNotificationTime,
  formatPhoneNumber,
  formatAccountNumber,
} from '@/lib/formatters';

describe('formatDate variants', () => {
  it('defaults to DD Mon YYYY and guards bad input', () => {
    expect(formatDate('2026-06-10')).toBe('10 Jun 2026');
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate('not-a-date')).toBe('N/A');
  });

  it('supports a numeric variant', () => {
    expect(formatDate('2026-06-10', 'numeric')).toBe('10/06/2026');
  });
});

describe('formatDateTime', () => {
  it('includes the date and a time component', () => {
    const out = formatDateTime('2026-06-10T09:30:00Z');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/Jun/);
    expect(out).toMatch(/:/); // has a time portion
  });

  it('guards falsy/invalid input', () => {
    expect(formatDateTime(null)).toBe('N/A');
    expect(formatDateTime('nope')).toBe('N/A');
  });
});

describe('formatNotificationTime', () => {
  it('renders relative buckets', () => {
    const now = Date.now();
    expect(formatNotificationTime(new Date(now))).toBe('Just now');
    expect(formatNotificationTime(new Date(now - 5 * 60 * 1000))).toBe('5 min ago');
    expect(formatNotificationTime(new Date(now - 1 * 60 * 60 * 1000))).toBe('1 hr ago');
    expect(formatNotificationTime(new Date(now - 3 * 60 * 60 * 1000))).toBe('3 hrs ago');
    expect(formatNotificationTime(new Date(now - 1 * 24 * 60 * 60 * 1000))).toBe('1 day ago');
    expect(formatNotificationTime(new Date(now - 3 * 24 * 60 * 60 * 1000))).toBe('3 days ago');
  });

  it('falls back to an absolute date beyond a week', () => {
    const old = new Date('2020-01-15T00:00:00Z');
    expect(formatNotificationTime(old)).toBe('15 Jan 2020');
  });

  it('returns empty string for falsy input', () => {
    expect(formatNotificationTime(null)).toBe('');
  });
});

describe('formatPhoneNumber', () => {
  it('normalises common PK input variants to +92 3XX XXXXXXX', () => {
    expect(formatPhoneNumber('03001234567')).toBe('+92 300 1234567');
    expect(formatPhoneNumber('3001234567')).toBe('+92 300 1234567');
    expect(formatPhoneNumber('+923001234567')).toBe('+92 300 1234567');
    expect(formatPhoneNumber('92 300 123 4567')).toBe('+92 300 1234567');
  });

  it('returns the input trimmed when it is not a PK mobile number', () => {
    expect(formatPhoneNumber('  12345  ')).toBe('12345');
    expect(formatPhoneNumber('')).toBe('');
  });
});

describe('formatAccountNumber', () => {
  it('leaves already-formatted (separated) numbers untouched', () => {
    expect(formatAccountNumber('MLO-S-100001234')).toBe('MLO-S-100001234');
    expect(formatAccountNumber('1234 5678')).toBe('1234 5678');
  });

  it('groups bare digit strings into blocks of four', () => {
    expect(formatAccountNumber('12345678')).toBe('1234 5678');
    expect(formatAccountNumber('123456789')).toBe('1234 5678 9');
  });
});
