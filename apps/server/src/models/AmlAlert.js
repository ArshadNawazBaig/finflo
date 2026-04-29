/**
 * AML Alert Model
 * ───────────────
 * Generated when a transaction triggers an AML rule.
 * Compliance officers review, escalate, or resolve alerts.
 */
const mongoose = require('mongoose');

const amlAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmlRule',
      required: true,
    },
    // Who triggered the alert
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    // Related transactions that triggered this alert
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FinancialTransaction',
      },
    ],
    // Alert details
    alertNumber: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    status: {
      type: String,
      required: true,
      enum: ['new', 'under_review', 'escalated', 'resolved', 'false_positive'],
      default: 'new',
    },
    // Assignment & review workflow
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: [
      {
        note: { type: String, required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, default: Date.now },
        action: {
          type: String,
          enum: ['note', 'status_change', 'escalation', 'assignment'],
          default: 'note',
        },
      },
    ],
    // Resolution
    resolvedAt: { type: Date },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionType: {
      type: String,
      enum: ['genuine', 'false_positive', 'reported_to_fmu', 'insufficient_evidence'],
    },
    resolutionNotes: { type: String },
    // Aggregated data for the alert
    totalAmount: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true },
);

amlAlertSchema.index({ user: 1, status: 1 });
amlAlertSchema.index({ user: 1, severity: 1 });
amlAlertSchema.index({ user: 1, createdAt: -1 });
amlAlertSchema.index({ customer: 1 });
amlAlertSchema.index({ member: 1 });
amlAlertSchema.index({ alertNumber: 1 }, { unique: true });

// Auto-generate alert number
amlAlertSchema.pre('save', async function () {
  if (!this.alertNumber) {
    const count = await mongoose.model('AmlAlert').countDocuments({ user: this.user });
    this.alertNumber = `AML-${String(count + 1).padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('AmlAlert', amlAlertSchema);
