const mongoose = require('mongoose');

// Snapshot of a teller's end-of-day close. Captures the computed cash
// position (opening + cashIn - cashOut) alongside the counted cash from
// physical denominations, so the variance (over/short) is permanently
// recorded for audit. This does NOT lock the day — corrections can still
// be posted; instead, each close is timestamped and signed by the teller
// who performed it, and a later re-close creates a new record.
const dailyCloseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    date: {
      // Truncated to midnight (start-of-day) so (user, branch, date) is a
      // stable per-day key. The actual close timestamp lives in `closedAt`.
      type: Date,
      required: true,
    },
    openingCash: { type: Number, default: 0 },
    cashIn: { type: Number, default: 0 },
    cashOut: { type: Number, default: 0 },
    expectedClosing: { type: Number, default: 0 },
    countedClosing: { type: Number, default: 0 },
    // counted - expected. Positive = over, negative = short.
    variance: { type: Number, default: 0 },
    denominations: {
      d1: { type: Number, default: 0 },
      d2: { type: Number, default: 0 },
      d5: { type: Number, default: 0 },
      d10: { type: Number, default: 0 },
      d20: { type: Number, default: 0 },
      d50: { type: Number, default: 0 },
      d100: { type: Number, default: 0 },
      d500: { type: Number, default: 0 },
      d1000: { type: Number, default: 0 },
      d5000: { type: Number, default: 0 },
    },
    notes: { type: String, default: '' },
    transactionCount: { type: Number, default: 0 },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closedByName: { type: String, default: '' },
    closedAt: { type: Date, default: Date.now },
    // Soft "supersede" pointer so re-closes don't destroy the prior record.
    // Latest close per (user, branch, date) is the one with supersededBy: null.
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyClose',
      default: null,
    },
  },
  { timestamps: true },
);

dailyCloseSchema.index({ user: 1, branchId: 1, date: -1 });
dailyCloseSchema.index({ user: 1, date: -1 });
dailyCloseSchema.index({ closedAt: -1 });

module.exports = mongoose.model('DailyClose', dailyCloseSchema);
