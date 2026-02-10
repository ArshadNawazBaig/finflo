const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Customer',
    },
    principal: { type: Number, required: true }, // Amount
    rate: { type: Number, required: true }, // Interest Rate %
    duration: { type: Number, required: true }, // Months
    emi: { type: Number, required: true }, // Monthly EMI
    totalAmount: { type: Number, required: true }, // Total Repayment with Interest
    startDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'defaulted', 'rejected'],
      default: 'active',
    },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    interestType: {
      type: String,
      enum: ['simple', 'emi'],
      default: 'simple',
    },
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Loan', loanSchema);
