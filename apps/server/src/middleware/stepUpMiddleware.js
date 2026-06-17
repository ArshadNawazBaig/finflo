const jwt = require('jsonwebtoken');

/**
 * Step-up (recent re-authentication) gate for high-risk actions.
 *
 * A sensitive request must carry a fresh re-auth PROOF — a short-lived
 * `step_up` JWT minted by `POST /api/auth/reauth` (or
 * `/api/member-auth/reauth`) after the caller re-proves their strongest factor
 * (a TOTP code if 2FA is enabled, otherwise the account password). This mirrors
 * the transaction-PIN pattern: the proof rides the `x-step-up-token` header and
 * is valid for ~15 minutes.
 *
 * On a missing / expired / mismatched proof we answer **403** with
 * `code: 'STEP_UP_REQUIRED'` and the `factor` the client should prompt for, so
 * the axios interceptor can open the re-auth modal and transparently retry.
 *
 * Principal-agnostic: works after `protect` (`req.user`) and after
 * `protectMember` (`req.member`). Place it AFTER the auth middleware in the
 * chain, and (for money routes) BEFORE `idempotency` so a rejected request
 * never reserves an idempotency key.
 *
 * @param {object} [opts]
 * @param {(req) => boolean} [opts.when] - only enforce when this predicate
 *   returns true (e.g. gate `/updatedetails` only when the email is actually
 *   changing, so benign profile edits aren't challenged).
 */
const requireRecentAuth = (opts = {}) => (req, res, next) => {
  if (typeof opts.when === 'function' && !opts.when(req)) return next();

  // Always runs after protect/protectMember; guard defensively all the same.
  const principal = req.user || req.member;
  if (!principal) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  // Tell the client which factor to collect: the account's strongest enrolled
  // one. `isTwoFactorEnabled` is present on both `req.user` and `req.member`
  // (the auth middleware only strips the password).
  const factor = principal.isTwoFactorEnabled ? '2fa' : 'password';
  const challenge = (message) =>
    res.status(403).json({ message, code: 'STEP_UP_REQUIRED', factor });

  const token = req.headers['x-step-up-token'];
  if (!token) {
    return challenge('Re-authentication required to authorize this action.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'step_up') {
      return challenge('Invalid re-authentication token.');
    }
    // The proof must belong to the caller (no cross-principal replay).
    if (decoded.id !== principal._id.toString()) {
      return challenge('Re-authentication token mismatch.');
    }
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return challenge('Re-authentication expired. Please verify again.');
    }
    return challenge('Invalid re-authentication token.');
  }
};

module.exports = { requireRecentAuth };
