const mongoose = require('mongoose');

/**
 * Per-tenant transfer limit tier. The system runs on a fixed 3-slot tier
 * model (basic / standard / premium) seeded lazily for each tenant — admins
 * can rename the tier and edit its limits but can't add slots beyond the
 * three. This keeps assignment UI predictable and avoids tier-explosion.
 *
 * `perChannelLimits` is keyed by channel name so it can grow without schema
 * migrations as new debit channels are introduced. Unknown channels fall
 * back to "no per-transaction cap" (only the daily cumulative cap applies).
 */
const channelLimitSchema = new mongoose.Schema(
  {
    perTransaction: {
      type: Number,
      default: 0, // 0 = no per-transaction cap on this channel
      min: 0,
    },
  },
  { _id: false },
);

const transferLimitTierSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    slot: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    perChannelLimits: {
      internal_transfer: { type: channelLimitSchema, default: () => ({}) },
      external_transfer: { type: channelLimitSchema, default: () => ({}) },
      goal_contribution: { type: channelLimitSchema, default: () => ({}) },
    },
    // Cross-channel daily cap. 0 = unlimited cumulative.
    dailyCumulativeCap: {
      type: Number,
      default: 0,
      min: 0,
    },
    // One-time fee charged when a member upgrades INTO this tier. Debited
    // from the member's current account at upgrade time. 0 = free upgrade
    // (typical for `basic`, which is the default new-member tier anyway).
    upgradeFee: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// One tier per slot per tenant.
transferLimitTierSchema.index({ user: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('TransferLimitTier', transferLimitTierSchema);
