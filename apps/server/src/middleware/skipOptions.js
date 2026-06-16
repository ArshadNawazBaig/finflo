/**
 * Wrap a rate limiter (or any middleware) so CORS preflight `OPTIONS`
 * requests pass straight through without consuming the limiter's quota.
 * Preflights carry no credentials and must always succeed, otherwise the
 * browser blocks the real request. Extracted from index.js.
 *
 * @param {import('express').RequestHandler} limiter - The middleware to guard.
 * @returns {import('express').RequestHandler} A middleware that short-circuits OPTIONS.
 *
 * @example
 * app.use('/api/auth/login', skipOptions(authLimiter));
 */
const skipOptions = (limiter) => (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  return limiter(req, res, next);
};

module.exports = skipOptions;
