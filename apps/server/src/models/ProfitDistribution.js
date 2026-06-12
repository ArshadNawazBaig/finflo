const mongoose = require('mongoose');

const profitDistributionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    amount: {
      type: Number,
      required: true,
      // A profit distribution represents money paid out — negative or zero
      // amounts indicate a bookkeeping error upstream and must be rejected
      // so they don't silently corrupt P&L and balance-sheet aggregates.
      validate: {
        validator: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
        message: 'ProfitDistribution.amount must be a positive number',
      },
    },
    type: {
      type: String,
      enum: ['regular', 'share', 'saving', 'term_deposit'],
      default: 'regular',
    },
    period: { type: String, required: true }, // e.g., "Jan 2026"
    calculationMethod: { type: String }, // Description of how profit was calculated
    investmentShare: { type: Number }, // Member's share percentage at time of distribution
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Completed',
    },
  },
  { timestamps: true },
);

// Money guardrail (P1.3): whole-rupee payout amount at rest (investmentShare is
// a percentage, not money — left alone).
require('../utils/money').applyMoneySetter(profitDistributionSchema, ['amount']);

module.exports = mongoose.model('ProfitDistribution', profitDistributionSchema);
