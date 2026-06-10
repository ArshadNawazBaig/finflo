/** Unit tests for email format + disposable-domain validation. */
const { validateEmail } = require('../../src/utils/emailValidator');

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

  it('rejects disposable domains', () => {
    const r = validateEmail('throwaway@mailinator.com');
    expect(r.isValid).toBe(false);
    expect(r.message).toMatch(/disposable/i);
  });

  it('is case-insensitive about the domain', () => {
    expect(validateEmail('User@Gmail.com').isValid).toBe(true);
  });
});
