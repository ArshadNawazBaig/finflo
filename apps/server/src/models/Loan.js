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
    // Which engine last applied a late fee this period: the daily cron accrual or
    // the manual flat-fee route. Whichever touches a loan first in a calendar month
    // "owns" it for that month; the other engine skips it, so the two can never
    // stack a fee on the same loan in the same period.
    lateFeeSource: { type: String, enum: ['accrual', 'manual', null], default: null },
    overdueAt: { type: Date },
    defaultedAt: { type: Date },
    defaultReason: { type: String },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    // Principal still outstanding. Distinct from remainingAmount (which blends
    // principal + accrued interest + late fees) so that contractual interest and
    // compounding accrue ONLY on principal, never on fees or already-capitalized
    // interest. Initialized to `principal` at creation; decremented by the
    // principal portion of each repayment; backfilled for legacy loans by
    // scripts/backfillOutstandingPrincipal.js.
    outstandingPrincipal: { type: Number },
    interestType: {
      type: String,
      enum: ['simple', 'emi', 'compound'],
      default: 'simple',
    },
    compoundedAmount: { type: Number, default: 0 },
    lastCompoundedAt: { type: Date },
    // Number of distinct missed installment-periods that have already had interest
    // capitalized. Used to compound interest exactly ONCE per missed period instead
    // of every day the loan stays overdue. Acts as an idempotency/CAS key.
    compoundedPeriods: { type: Number, default: 0 },
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
    // ── Group / joint-liability linkage ──────────────────────────────────────
    // When set, this loan is one member's sub-loan inside a group lending cycle.
    // The individual-loan engine ignores these fields entirely and keeps working
    // unchanged; they only let the group layer (groupLoanService + the crons'
    // at-risk cascade) find a sub-loan's parent group.
    groupLoan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupLoan',
      default: null,
    },
    loanGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanGroup',
      default: null,
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
loanSchema.index({ groupLoan: 1 });
// Compound indexes matching the real query shapes: the per-customer status
// lookup (member dashboard, "active loan per customer" guards, member-list
// counts) and tenant-scoped status lists/dashboards, both newest-first.
loanSchema.index({ customer: 1, status: 1, createdAt: -1 });
loanSchema.index({ user: 1, status: 1, createdAt: -1 });
// Guarantor lookups (member detail page lists loans a member co-signed).
loanSchema.index({ grantor1: 1 });
loanSchema.index({ grantor2: 1 });

// Money guardrail (P1.3): round all money fields to whole rupees at rest so a
// fractional rupee can never be persisted, even if a caller forgets to round.
require('../utils/money').applyMoneySetter(loanSchema, [
  'principal',
  'emi',
  'totalAmount',
  'lateFeeAmount',
  'paidAmount',
  'remainingAmount',
  'outstandingPrincipal',
  'compoundedAmount',
]);

module.exports = mongoose.model('Loan', loanSchema);
