const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    // Tenant owner (business) — used for filtering and isolation.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    ticketNumber: {
      type: String,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: [
        'wrong_charge',
        'missing_credit',
        'loan_dispute',
        'statement_error',
        'service_complaint',
        'other',
      ],
      default: 'other',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'awaiting_member', 'resolved', 'closed'],
      default: 'open',
    },
    // SLA: slaDeadline is set at creation based on priority. Breached when
    // status is non-terminal and now > slaDeadline.
    slaDeadline: { type: Date, required: true },
    slaBreachedAt: { type: Date },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolution: { type: String, maxlength: 5000 },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Optional reference to the disputed transaction/loan
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
    },
    relatedLoan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
    },
    // Threaded conversation between member and staff
    messages: [
      {
        authorType: { type: String, enum: ['member', 'staff'], required: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, required: true },
        authorName: { type: String },
        body: { type: String, required: true, maxlength: 5000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// SLA defaults (hours) by priority — tunable per tenant later.
const SLA_HOURS = { urgent: 4, high: 24, medium: 72, low: 168 };

disputeSchema.statics.slaHoursFor = (priority) =>
  SLA_HOURS[priority] || SLA_HOURS.medium;

// Auto-generated required fields (ticketNumber, slaDeadline) must be set in
// pre('validate'), NOT pre('save') — save runs after validation, so generating
// them in pre('save') leaves them undefined when `required` validators run.
disputeSchema.pre('validate', async function () {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Dispute').countDocuments();
    this.ticketNumber = `DSP-${String(count + 10001).padStart(5, '0')}`;
  }
  if (!this.slaDeadline) {
    const hours = SLA_HOURS[this.priority] || SLA_HOURS.medium;
    this.slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
});

disputeSchema.index({ user: 1, status: 1, createdAt: -1 });
disputeSchema.index({ member: 1, createdAt: -1 });
disputeSchema.index({ branchId: 1 });
disputeSchema.index({ status: 1, slaDeadline: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
