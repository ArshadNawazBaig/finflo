/**
 * Suspicious Activity Report (SAR) Model
 * ───────────────────────────────────────
 * Aligned with Pakistan's Financial Monitoring Unit (FMU) requirements.
 * Generated from AML alerts that require formal regulatory reporting.
 */
const mongoose = require('mongoose');

const sarSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportNumber: {
      type: String,
      required: true,
      unique: true,
    },
    alert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmlAlert',
    },
    // Subject of the report
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    subjectName: { type: String, required: true },
    subjectCNIC: { type: String },
    subjectPhone: { type: String },
    subjectAddress: { type: String },
    // Activity details
    suspiciousActivity: {
      type: String,
      required: true,
    },
    activityDateFrom: { type: Date, required: true },
    activityDateTo: { type: Date, required: true },
    activityType: {
      type: String,
      enum: [
        'structuring',
        'unusual_transaction',
        'identity_fraud',
        'terrorist_financing',
        'tax_evasion',
        'bribery_corruption',
        'insider_trading',
        'fraud',
        'other',
      ],
      required: true,
    },
    // Transaction details
    transactionDetails: [
      {
        date: { type: Date },
        amount: { type: Number },
        type: { type: String },
        description: { type: String },
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FinancialTransaction',
        },
      },
    ],
    totalSuspiciousAmount: { type: Number, default: 0 },
    // Narrative
    narrative: {
      type: String,
      required: true,
    },
    // Actions taken
    actionsTaken: { type: String },
    // Filing status
    filingStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'submitted', 'acknowledged', 'rejected'],
      default: 'draft',
    },
    submittedAt: { type: Date },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: { type: Date },
    fmuReferenceNumber: { type: String },
    // Internal tracking
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: { type: String },
  },
  { timestamps: true },
);

sarSchema.index({ user: 1, filingStatus: 1 });
sarSchema.index({ user: 1, createdAt: -1 });
sarSchema.index({ reportNumber: 1 }, { unique: true });

// Auto-generate report number
sarSchema.pre('save', async function () {
  if (!this.reportNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('SuspiciousActivityReport').countDocuments({ user: this.user });
    this.reportNumber = `SAR-${year}-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('SuspiciousActivityReport', sarSchema);
