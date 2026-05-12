const mongoose = require('mongoose');

// Append-only ledger of Stripe (and other provider) webhook events that have
// already been processed. We use this for idempotency: when an event arrives
// whose `eventId` is already in this collection, we short-circuit the handler
// and return 200, avoiding duplicate side effects (double plan downgrades,
// duplicate Payment rows, double notifications).
//
// Records expire after 60 days — long enough to absorb Stripe's
// up-to-30-day retry window with margin.
const processedWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: 'stripe', index: true },
    type: { type: String },
    receivedAt: { type: Date, default: Date.now, expires: 60 * 24 * 60 * 60 },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.ProcessedWebhookEvent ||
  mongoose.model('ProcessedWebhookEvent', processedWebhookEventSchema);
