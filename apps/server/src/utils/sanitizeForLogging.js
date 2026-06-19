/**
 * Redacts sensitive fields from an object before it's written to logs.
 *
 * Financial/PII apps must never leak passwords, PINs, tokens, OTPs, or CNICs
 * into log aggregators (which are often less access-controlled than the DB).
 * Use this whenever logging `req.body`, an error with a request payload, or any
 * object that may contain secrets:
 *
 *   logger.error('createMember failed', sanitizeForLogging(req.body));
 *
 * Matching is case-insensitive on the key name and recurses into nested
 * objects/arrays. Circular references are handled.
 */

/** Lowercased key names whose values are always redacted. */
const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'oldpassword',
  'currentpassword',
  'confirmpassword',
  'pin',
  'newpin',
  'oldpin',
  'currentpin',
  'transactionpin',
  'token',
  'accesstoken',
  'refreshtoken',
  'transactiontoken',
  'jwt',
  'authorization',
  'cookie',
  'otp',
  'code',
  'secret',
  'clientsecret',
  'apikey',
  'api_key',
  'cnic',
  'ssn',
  'cardnumber',
  'cvv',
  'cvc',
  'signature',
]);

const REDACTED = '[REDACTED]';

/**
 * Return a deep copy of `input` with sensitive values replaced by `[REDACTED]`.
 * Non-objects are returned unchanged. The input is never mutated.
 * @param {*} input - Any value (object, array, or primitive).
 * @param {WeakSet} [seen] - Internal cycle guard; do not pass.
 * @returns {*}
 */
const sanitizeForLogging = (input, seen = new WeakSet()) => {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForLogging(item, seen));
  }
  if (input && typeof input === 'object') {
    if (seen.has(input)) return '[Circular]';
    seen.add(input);
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? REDACTED
        : sanitizeForLogging(value, seen);
    }
    return out;
  }
  return input;
};

module.exports = { sanitizeForLogging, SENSITIVE_KEYS };
