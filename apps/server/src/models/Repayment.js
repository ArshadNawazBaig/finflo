const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    loan: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Loan' },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Customer',
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Repayment', repaymentSchema);
