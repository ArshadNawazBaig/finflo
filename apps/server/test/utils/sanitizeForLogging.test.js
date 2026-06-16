/**
 * Unit tests for sanitizeForLogging — redacts secrets (passwords, PINs, tokens,
 * CNIC, …) before objects are written to logs, recursing into nested structures
 * without mutating the input.
 */
const { sanitizeForLogging } = require('../../src/utils/sanitizeForLogging');

describe('sanitizeForLogging', () => {
  it('redacts top-level sensitive keys (case-insensitive)', () => {
    const out = sanitizeForLogging({
      email: 'a@b.com',
      password: 'hunter2',
      PIN: '1234',
      transactionToken: 'jwt.x.y',
    });
    expect(out).toEqual({
      email: 'a@b.com',
      password: '[REDACTED]',
      PIN: '[REDACTED]',
      transactionToken: '[REDACTED]',
    });
  });

  it('recurses into nested objects and arrays', () => {
    const out = sanitizeForLogging({
      user: { name: 'x', cnic: '35202-1234567-3' },
      items: [{ otp: '000', label: 'ok' }],
    });
    expect(out.user).toEqual({ name: 'x', cnic: '[REDACTED]' });
    expect(out.items[0]).toEqual({ otp: '[REDACTED]', label: 'ok' });
  });

  it('does not mutate the input', () => {
    const input = { password: 'secret', keep: 1 };
    sanitizeForLogging(input);
    expect(input.password).toBe('secret');
  });

  it('passes primitives through unchanged', () => {
    expect(sanitizeForLogging('hi')).toBe('hi');
    expect(sanitizeForLogging(42)).toBe(42);
    expect(sanitizeForLogging(null)).toBe(null);
  });

  it('handles circular references', () => {
    const a = { token: 'x' };
    a.self = a;
    const out = sanitizeForLogging(a);
    expect(out.token).toBe('[REDACTED]');
    expect(out.self).toBe('[Circular]');
  });
});
