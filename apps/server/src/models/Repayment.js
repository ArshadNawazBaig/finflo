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
    interestAmount: { type: Number, default: 0 },
    principalAmount: { type: Number, default: 0 },
    installmentNumber: { type: Number },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Reversed'],
      default: 'Completed',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    notes: { type: String },
  },
  { timestamps: true },
);

// Indexes for performance
repaymentSchema.index({ loan: 1, date: -1 });
repaymentSchema.index({ user: 1, date: -1 });
repaymentSchema.index({ customer: 1 });
repaymentSchema.index({ branchId: 1 });
repaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Repayment', repaymentSchema);
