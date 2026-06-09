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
      enum: [
        'pending',
        'active',
        'overdue',
        'completed',
        'defaulted',
        'rejected',
        'renewed',
      ],
      default: 'active',
    },
    lateFeeAmount: { type: Number, default: 0 },
    lateFeeAppliedAt: { type: Date },
    overdueAt: { type: Date },
    defaultedAt: { type: Date },
    defaultReason: { type: String },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    interestType: {
      type: String,
      enum: ['simple', 'emi', 'compound'],
      default: 'simple',
    },
    compoundedAmount: { type: Number, default: 0 },
    lastCompoundedAt: { type: Date },
    notes: { type: String }, // Member-submitted purpose/notes
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
    grantor1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    grantor1Status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    grantor1ApprovedAt: { type: Date },
    grantor1Signature: { type: String }, // base64 data URL
    grantor1AgreementAcceptedAt: { type: Date },
    grantor2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    grantor2Status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    grantor2ApprovedAt: { type: Date },
    grantor2Signature: { type: String }, // base64 data URL
    grantor2AgreementAcceptedAt: { type: Date },
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
    // ── Renewal linkage ──────────────────────────────────────────────────────
    // renewedFrom is set on the NEW loan and points back to the loan it renewed.
    // renewedTo is set on the OLD loan and points forward to its replacement.
    // For 'extend' renewals no new loan is created — the same record is mutated
    // and renewalCount/lastRenewedAt are bumped in place.
    renewedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
    },
    renewedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
    },
    renewalType: {
      type: String,
      enum: ['rollover', 'topup', 'extend'],
    },
    renewalCount: { type: Number, default: 0 },
    lastRenewedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes for performance
loanSchema.index({ user: 1 });
loanSchema.index({ customer: 1 });
loanSchema.index({ branchId: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ createdAt: -1 });
loanSchema.index({ renewedFrom: 1 });

module.exports = mongoose.model('Loan', loanSchema);
