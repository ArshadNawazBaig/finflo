const mongoose = require('mongoose');

// Idempotency ledger for member/teller-initiated money actions (deposits,
// withdrawals, transfers, repayments, checkbook issuance, goal credits).
//
// The webhook side is already deduped via ProcessedWebhookEvent; this is the
// equivalent guard for HUMAN-initiated money moves, which previously had none —
// a double-submitted form or a retried mobile request would post the money
// twice. The middleware (middleware/idempotency.js) claims a key atomically via
// the unique { actorId, key } index before the handler runs, then stores the
// response so a replay returns the original result instead of re-executing.
//
// Records expire after 24h — far longer than any realistic client retry window,
// short enough that keys don't accumulate.
const idempotencyKeySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    key: { type: String, required: true },
    scope: { type: String },
    // Hash of the request body — lets us reject a key reused with a DIFFERENT
    // payload (a client bug) rather than silently returning the wrong response.
    requestHash: { type: String },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    statusCode: { type: Number },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    receivedAt: { type: Date, default: Date.now, expires: 24 * 60 * 60 },
  },
  { timestamps: true },
);

idempotencyKeySchema.index({ actorId: 1, key: 1 }, { unique: true });

module.exports =
  mongoose.models.IdempotencyKey ||
  mongoose.model('IdempotencyKey', idempotencyKeySchema);
