const mongoose = require('mongoose');
const { applyMoneySetter } = require('../utils/money');

/**
 * PayrollRun — one month's payroll processing for a tenant (optionally scoped to
 * a branch). Lifecycle: draft → approved → paid (or cancelled). Money only moves
 * at the `paid` step (see services/payrollService.markPayrollPaid). The unique
 * (user, month, year) index makes a run idempotent — a month cannot be run twice.
 */
const payrollRunSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid', 'cancelled'],
      default: 'draft',
    },
    runDate: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    paymentMethod: {
      type: String,
      enum: ['bank', 'cash', 'cheque'],
      default: 'bank',
    },
    employeeCount: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    totalNet: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Idempotency: one run per tenant per month.
payrollRunSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });
payrollRunSchema.index({ user: 1, status: 1, createdAt: -1 });
payrollRunSchema.index({ user: 1, branchId: 1 });

applyMoneySetter(payrollRunSchema, [
  'totalGross',
  'totalDeductions',
  'totalNet',
]);

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
