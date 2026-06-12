const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');

const hashRequest = (req) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

/**
 * Idempotency guard for money-mutating endpoints.
 *
 * Mount AFTER the auth middleware (needs `req.user` or `req.member`). When a
 * request carries an `Idempotency-Key` header, the first request claims the key
 * atomically and its response is captured; any replay with the same key returns
 * the stored response instead of re-running the handler — so a double-submitted
 * deposit/transfer/repayment moves money exactly once.
 *
 * Backwards compatible by design: a request WITHOUT the header passes straight
 * through (older mobile builds keep working), and any internal error in this
 * layer is logged and bypassed rather than blocking a money action — the
 * route's own transaction/guard logic is still the source of truth.
 */
const idempotency = async (req, res, next) => {
  try {
    const key = req.get('Idempotency-Key');
    if (!key) return next();

    const actorId = req.user?._id || req.member?._id;
    if (!actorId) return next(); // unauthenticated — let downstream guards handle

    const owner = req.user?.effectiveOwnerId || req.member?.user || actorId;
    const scope = `${req.method} ${req.baseUrl || ''}${req.path || ''}`;
    const requestHash = hashRequest(req);

    // Claim the key atomically. The unique { actorId, key } index makes the
    // create() the synchronisation point between concurrent duplicate requests.
    let record;
    try {
      record = await IdempotencyKey.create({
        owner,
        actorId,
        key,
        scope,
        requestHash,
        status: 'pending',
      });
    } catch (err) {
      if (err.code !== 11000) throw err;

      // Key already claimed — resolve against the existing record.
      const existing = await IdempotencyKey.findOne({ actorId, key });
      if (!existing) return next(); // expired/removed between create and read

      if (existing.requestHash && existing.requestHash !== requestHash) {
        return res.status(422).json({
          message:
            'This Idempotency-Key was already used with a different request.',
        });
      }
      if (existing.status === 'completed') {
        return res.status(existing.statusCode || 200).json(existing.responseBody);
      }
      // Still pending → a duplicate request is in flight right now.
      return res.status(409).json({
        message: 'A request with this Idempotency-Key is already in progress.',
      });
    }

    // We own the key. Capture the response and persist it on success; release
    // (delete) it on a non-2xx so the client can legitimately retry.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const statusCode = res.statusCode || 200;
      if (statusCode >= 200 && statusCode < 300) {
        IdempotencyKey.updateOne(
          { _id: record._id },
          { status: 'completed', statusCode, responseBody: body },
        ).catch(() => {});
      } else {
        IdempotencyKey.deleteOne({ _id: record._id }).catch(() => {});
      }
      return originalJson(body);
    };

    return next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    return next();
  }
};

module.exports = { idempotency };
