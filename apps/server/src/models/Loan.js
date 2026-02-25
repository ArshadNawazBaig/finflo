const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Customer',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
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
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    grantor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    grantorStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    grantorApprovedAt: { type: Date },
    riskDetails: {
      grade: { type: String }, // A+, A, B, C, D, F
      score: { type: Number }, // 0-100
      suggestion: { type: String }, // Approve, Deny, Caution
      factors: [{ type: String }],
    },
    automatedReminders: [
      {
        type: { type: String, enum: ['upcoming', 'overdue'] },
        installmentNumber: { type: Number },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanProduct',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Loan', loanSchema);
