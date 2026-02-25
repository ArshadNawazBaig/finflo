const mongoose = require('mongoose');

const loanProductSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true },
    description: { type: String },
    interestRate: { type: Number, required: true }, // Default %
    duration: { type: Number, required: true }, // Default months
    interestType: {
      type: String,
      enum: ['simple', 'emi'],
      default: 'simple',
    },
    minAmount: { type: Number, default: 0 },
    maxAmount: { type: Number },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('LoanProduct', loanProductSchema);
