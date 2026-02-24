const mongoose = require('mongoose');

const businessShareSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['share_deposit', 'share_withdrawal', 'share_profit'],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String },
    shareBalanceAfter: { type: Number }, // Member's share balance after this transaction
    period: { type: String }, // e.g. "Feb 2026" — used for profit entries
    date: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BusinessShare', businessShareSchema);
