/**
 * Enhanced Password Policy
 * ────────────────────────
 * Bank-grade password policy enforcement.
 * SBP requires strong password policies for all financial systems.
 */
const bcrypt = require('bcryptjs');

// ── Default Policy Configuration ─────────────────────────────────────────────
const DEFAULT_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  specialChars: '@$!%*?&._-#^(){}[]|\\:;"\'<>,~/`+= ',
  maxConsecutiveRepeating: 3, // No more than 3 of the same char in a row
  historyCount: 5, // Reject last N passwords
  expiryDays: 90, // Force change after N days
  commonPasswordCheck: true, // Reject top common passwords
};

// ── Top 100 common passwords (subset — expand as needed) ─────────────────────
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'monkey', 'letmein',
  'dragon', 'master', 'login', 'princess', 'welcome', 'shadow', 'sunshine',
  'trustno1', 'iloveyou', 'batman', 'football', 'charlie', 'access',
  'hello', 'admin', 'admin123', 'passw0rd', 'p@ssword', 'p@ssw0rd',
  'password!', 'changeme', 'default', 'test123', 'guest', 'qwerty1',
  '111111', '000000', '123123', '654321', 'abcdef', 'abcabc',
  'pakistan', 'pakistan1', 'pakistan123', 'lahore', 'karachi', 'islamabad',
]);

/**
 * Validate a password against the policy.
 * @param {string} password - The password to validate
 * @param {Object} [policyOverrides] - Override default policy values
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validatePasswordPolicy = (password, policyOverrides = {}) => {
  const policy = { ...DEFAULT_POLICY, ...policyOverrides };
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required.'] };
  }

  // Length check
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long.`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`Password must be at most ${policy.maxLength} characters long.`);
  }

  // Character class checks
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (policy.requireDigit && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit.');
  }
  if (policy.requireSpecialChar) {
    const specialRegex = new RegExp(
      `[${policy.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`,
    );
    if (!specialRegex.test(password)) {
      errors.push('Password must contain at least one special character.');
    }
  }

  // Consecutive repeating characters
  if (policy.maxConsecutiveRepeating) {
    const repeatRegex = new RegExp(`(.)\\1{${policy.maxConsecutiveRepeating},}`);
    if (repeatRegex.test(password)) {
      errors.push(
        `Password must not contain more than ${policy.maxConsecutiveRepeating} consecutive repeating characters.`,
      );
    }
  }

  // Common password check
  if (policy.commonPasswordCheck) {
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('This password is too common. Please choose a stronger password.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if a password was used in the recent history.
 * @param {string} newPassword - The new plaintext password
 * @param {Array<{hash: string}>} passwordHistory - Array of previous hashed passwords
 * @returns {Promise<boolean>} - True if the password was recently used
 */
const isPasswordInHistory = async (newPassword, passwordHistory = []) => {
  if (!passwordHistory || passwordHistory.length === 0) return false;

  for (const entry of passwordHistory) {
    if (entry.hash) {
      const match = await bcrypt.compare(newPassword, entry.hash);
      if (match) return true;
    }
  }
  return false;
};

/**
 * Calculate the password expiry date from now.
 * @param {number} expiryDays - Number of days until expiry
 * @returns {Date}
 */
const getPasswordExpiryDate = (expiryDays = DEFAULT_POLICY.expiryDays) => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);
  return expiry;
};

/**
 * Check if a password has expired.
 * @param {Date} expiryDate - The password expiry date
 * @returns {boolean}
 */
const isPasswordExpired = (expiryDate) => {
  if (!expiryDate) return false; // No expiry set means not expired
  return new Date() > new Date(expiryDate);
};

/**
 * Get password strength score (0-100) for UI feedback.
 * @param {string} password
 * @returns {{ score: number, label: string, color: string }}
 */
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'None', color: '#ef4444' };

  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 5;

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  // Variety bonus — unique characters
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) score += 10;
  if (uniqueChars >= 12) score += 5;

  score = Math.min(score, 100);

  if (score >= 80) return { score, label: 'Strong', color: '#22c55e' };
  if (score >= 60) return { score, label: 'Good', color: '#84cc16' };
  if (score >= 40) return { score, label: 'Fair', color: '#eab308' };
  if (score >= 20) return { score, label: 'Weak', color: '#f97316' };
  return { score, label: 'Very Weak', color: '#ef4444' };
};

module.exports = {
  DEFAULT_POLICY,
  validatePasswordPolicy,
  isPasswordInHistory,
  getPasswordExpiryDate,
  isPasswordExpired,
  getPasswordStrength,
};
