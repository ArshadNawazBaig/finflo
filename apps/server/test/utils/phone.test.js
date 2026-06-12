/**
 * Unit tests for phone-number E.164 normalisation (defaults to Pakistan +92).
 */
const { normalizePhone } = require('../../src/utils/phone');

describe('normalizePhone', () => {
  it('converts a local PK trunk number to E.164', () => {
    expect(normalizePhone('03001234567')).toBe('+923001234567');
    expect(normalizePhone('0300 123 4567')).toBe('+923001234567');
  });

  it('keeps an existing E.164 number (stripping separators)', () => {
    expect(normalizePhone('+923001234567')).toBe('+923001234567');
    expect(normalizePhone('+92 300 123 4567')).toBe('+923001234567');
  });

  it('handles a 00 international prefix', () => {
    expect(normalizePhone('00923001234567')).toBe('+923001234567');
  });

  it('prepends the country code to a bare national number', () => {
    expect(normalizePhone('3001234567')).toBe('+923001234567');
  });

  it('passes through a number that already includes the country code', () => {
    expect(normalizePhone('923001234567')).toBe('+923001234567');
  });

  it('respects a custom country code', () => {
    expect(normalizePhone('05551234567', '1')).toBe('+15551234567');
  });

  it('returns null for empty / invalid input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('+123')).toBeNull(); // too short to be E.164
  });
});
