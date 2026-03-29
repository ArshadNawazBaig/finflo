const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
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
      enum: ['deposit', 'withdrawal', 'transfer_send', 'transfer_receive', 'profit'],
      required: true,
    },
    amount: { type: Number, required: true },
    accountType: {
      type: String,
      enum: ['current', 'saving'],
      default: 'current',
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Reversed'],
      default: 'Completed',
    },
    date: { type: Date, default: Date.now },
    description: { type: String },
    balanceAfter: { type: Number }, // Member's balance after this transaction
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Investment', investmentSchema);
