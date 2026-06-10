/** Unit tests for the lightweight validatePassword regex helper. */
const { validatePassword } = require('../../src/utils/validation');

describe('validatePassword', () => {
  it('accepts a password with upper, digit and special char (>= 8 chars)', () => {
    expect(validatePassword('Passw0rd!').isValid).toBe(true);
  });

  it('rejects an empty password', () => {
    const r = validatePassword('');
    expect(r.isValid).toBe(false);
    expect(r.message).toMatch(/at least 8 characters/i);
  });

  it('rejects when missing an uppercase letter', () => {
    expect(validatePassword('passw0rd!').isValid).toBe(false);
  });

  it('rejects when missing a digit', () => {
    expect(validatePassword('Password!').isValid).toBe(false);
  });

  it('rejects when missing a special character', () => {
    expect(validatePassword('Password1').isValid).toBe(false);
  });

  it('rejects when shorter than 8 characters', () => {
    expect(validatePassword('Pa1!').isValid).toBe(false);
  });
});
