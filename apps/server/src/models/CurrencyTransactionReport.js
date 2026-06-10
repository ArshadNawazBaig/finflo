/**
 * Currency Transaction Report (CTR) Model
 * ────────────────────────────────────────
 * Auto-generated for cash transactions exceeding the reporting threshold.
 * SBP/FMU requires reporting of large cash transactions (default: PKR 2,000,000+).
 */
const mongoose = require('mongoose');

const ctrSchema = new mongoose.Schema(
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
    // Transaction that triggered the CTR
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
      required: true,
    },
    // Subject
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
    // Transaction details
    amount: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    transactionType: { type: String, required: true }, // deposit, withdrawal, etc.
    transactionDate: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online'],
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    // Filing
    filingStatus: {
      type: String,
      enum: ['auto_generated', 'reviewed', 'submitted', 'acknowledged'],
      default: 'auto_generated',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: { type: Date },
    submittedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

ctrSchema.index({ user: 1, filingStatus: 1 });
ctrSchema.index({ user: 1, createdAt: -1 });
ctrSchema.index({ reportNumber: 1 }, { unique: true });

// Auto-generate report number.
// NOTE: `countDocuments + 1` is NOT atomic — two CTRs created concurrently for the
// same tenant computed the same sequence number and the second save threw on the
// unique index, silently DROPPING a regulatory filing. We append a short token
// derived from the document's own _id so the number is always unique (no dropped
// filing) while staying human-readable and roughly ordered. For strictly
// contiguous numbering, replace this with an atomic counter document.
ctrSchema.pre('save', async function () {
  if (!this.reportNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose
      .model('CurrencyTransactionReport')
      .countDocuments({ user: this.user });
    const uniqueSuffix = this._id.toString().slice(-4).toUpperCase();
    this.reportNumber = `CTR-${year}-${String(count + 1).padStart(5, '0')}-${uniqueSuffix}`;
  }
});

module.exports = mongoose.model('CurrencyTransactionReport', ctrSchema);
