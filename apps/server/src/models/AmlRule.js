/**
 * AML Rule Model
 * ──────────────
 * Configurable Anti-Money Laundering monitoring rules.
 * Banks define rules that automatically flag suspicious transactions.
 */
const mongoose = require('mongoose');

const amlRuleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    },
    type: {
      type: String,
      required: true,
      enum: ['threshold', 'velocity', 'pattern', 'structuring'],
    },
    // Rule-specific conditions
    conditions: {
      // Threshold: flag single transactions exceeding this amount
      amount: { type: Number },
      // Velocity: flag when count exceeds limit within period
      count: { type: Number },
      periodHours: { type: Number }, // Time window in hours
      // Structuring: flag multiple transactions just below threshold
      belowThresholdPercent: { type: Number, default: 90 }, // e.g., 90% of threshold
      structuringCount: { type: Number }, // How many sub-threshold transactions trigger alert
      structuringPeriodHours: { type: Number },
      // Pattern: specific transaction patterns
      patternType: {
        type: String,
        enum: ['round_trip', 'rapid_movement', 'smurfing', 'layering'],
      },
      // Common filters
      transactionTypes: [String], // Filter by transaction categories
      paymentMethods: [String], // Filter by cash/online
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Track rule effectiveness
    totalTriggered: { type: Number, default: 0 },
    lastTriggeredAt: { type: Date },
  },
  { timestamps: true },
);

amlRuleSchema.index({ user: 1, isActive: 1 });
amlRuleSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('AmlRule', amlRuleSchema);
