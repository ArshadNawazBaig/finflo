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
      enum: ['deposit', 'withdrawal', 'transfer_send', 'transfer_receive'],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String },
    balanceAfter: { type: Number }, // Member's balance after this transaction
  },
  { timestamps: true },
);

module.exports = mongoose.model('Investment', investmentSchema);
