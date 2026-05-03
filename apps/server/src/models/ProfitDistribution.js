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
    amount: { type: Number, required: true },
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

module.exports = mongoose.model('ProfitDistribution', profitDistributionSchema);
