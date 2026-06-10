/** lib/utils — email + password validators used across auth and member forms. */
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '@/lib/utils';

describe('validateEmail', () => {
  it('accepts a normal email', () => {
    expect(validateEmail('user@gmail.com').isValid).toBe(true);
  });

  it('rejects an empty email', () => {
    const r = validateEmail('');
    expect(r.isValid).toBe(false);
    expect(r.message).toMatch(/required/i);
  });

  it('rejects a malformed email', () => {
    expect(validateEmail('not-an-email').isValid).toBe(false);
    expect(validateEmail('a@b').isValid).toBe(false);
  });

  it('rejects disposable domains (case-insensitive)', () => {
    const r = validateEmail('x@Mailinator.com');
    expect(r.isValid).toBe(false);
    expect(r.message).toMatch(/disposable/i);
  });
});

describe('validatePassword', () => {
  it('accepts upper + digit + special, length >= 8', () => {
    expect(validatePassword('Passw0rd!').isValid).toBe(true);
  });

  it('rejects when a class is missing or too short', () => {
    expect(validatePassword('password').isValid).toBe(false); // no upper/digit/special
    expect(validatePassword('Password1').isValid).toBe(false); // no special
    expect(validatePassword('Pa1!').isValid).toBe(false); // too short
    expect(validatePassword('').isValid).toBe(false);
  });
});
