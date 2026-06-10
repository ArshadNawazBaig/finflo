/**
 * Unit tests for the bank-grade password policy — length, character classes,
 * repeats, common-password rejection, expiry maths and strength scoring.
 */
const {
  validatePasswordPolicy,
  isPasswordInHistory,
  getPasswordExpiryDate,
  isPasswordExpired,
  getPasswordStrength,
} = require('../../src/utils/passwordPolicy');
const bcrypt = require('bcryptjs');

describe('validatePasswordPolicy', () => {
  it('accepts a strong 12+ char password with all classes', () => {
    const r = validatePasswordPolicy('StrongPassw0rd!');
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects a missing password', () => {
    const r = validatePasswordPolicy('');
    expect(r.isValid).toBe(false);
    expect(r.errors[0]).toMatch(/required/i);
  });

  it('rejects passwords below the minimum length', () => {
    const r = validatePasswordPolicy('Ab1!xy');
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => /at least 12/i.test(e))).toBe(true);
  });

  it('flags each missing character class', () => {
    const r = validatePasswordPolicy('aaaaaaaaaaaa'); // lower only, also repeats
    expect(r.errors.some((e) => /uppercase/i.test(e))).toBe(true);
    expect(r.errors.some((e) => /digit/i.test(e))).toBe(true);
    expect(r.errors.some((e) => /special/i.test(e))).toBe(true);
  });

  it('rejects more than 3 consecutive repeating characters', () => {
    const r = validatePasswordPolicy('Aaaaa1bcdef!'); // 4 a's in a row
    expect(r.errors.some((e) => /repeating/i.test(e))).toBe(true);
  });

  it('rejects a common password', () => {
    const r = validatePasswordPolicy('password123');
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => /too common/i.test(e))).toBe(true);
  });

  it('honours policy overrides (shorter minimum)', () => {
    const r = validatePasswordPolicy('Ab1!xy', { minLength: 6 });
    expect(r.isValid).toBe(true);
  });
});

describe('isPasswordInHistory', () => {
  it('detects a reused password by bcrypt comparison', async () => {
    const hash = await bcrypt.hash('OldPassw0rd!', 10);
    expect(await isPasswordInHistory('OldPassw0rd!', [{ hash }])).toBe(true);
  });

  it('returns false when no match and on empty history', async () => {
    const hash = await bcrypt.hash('OldPassw0rd!', 10);
    expect(await isPasswordInHistory('Different1!', [{ hash }])).toBe(false);
    expect(await isPasswordInHistory('x', [])).toBe(false);
  });
});

describe('password expiry helpers', () => {
  it('getPasswordExpiryDate returns a future date', () => {
    const d = getPasswordExpiryDate(90);
    expect(d.getTime()).toBeGreaterThan(Date.now());
  });

  it('isPasswordExpired is true for a past date, false for future/null', () => {
    expect(isPasswordExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isPasswordExpired(new Date(Date.now() + 100000))).toBe(false);
    expect(isPasswordExpired(null)).toBe(false);
  });
});

describe('getPasswordStrength', () => {
  it('scores an empty password as 0 / None', () => {
    const s = getPasswordStrength('');
    expect(s.score).toBe(0);
    expect(s.label).toBe('None');
  });

  it('scores a long varied password as Strong', () => {
    const s = getPasswordStrength('Str0ng!PasswordWithVariety$9');
    expect(s.score).toBeGreaterThanOrEqual(80);
    expect(s.label).toBe('Strong');
  });

  it('never exceeds 100', () => {
    const s = getPasswordStrength('A'.repeat(40) + 'b9!cD3$eF7%');
    expect(s.score).toBeLessThanOrEqual(100);
  });
});
