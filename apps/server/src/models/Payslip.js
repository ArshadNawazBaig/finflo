const mongoose = require('mongoose');
const { applyMoneySetter } = require('../utils/money');

/**
 * Payslip — one per employee per PayrollRun. The unique (employee, payrollRun)
 * index guarantees a single payslip per employee per run. `loanRepaymentRef` is
 * stamped when the loan-EMI deduction is actually settled through
 * loanRepaymentService during markPayrollPaid.
 */
const payslipSchema = new mongoose.Schema(
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
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    payrollRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    earnings: {
      basic: { type: Number, default: 0, min: 0 },
      hra: { type: Number, default: 0, min: 0 },
      medical: { type: Number, default: 0, min: 0 },
      transport: { type: Number, default: 0, min: 0 },
      otherAllowances: { type: Number, default: 0, min: 0 },
      overtime: { type: Number, default: 0, min: 0 },
    },
    deductions: {
      tax: { type: Number, default: 0, min: 0 },
      providentFund: { type: Number, default: 0, min: 0 },
      eobi: { type: Number, default: 0, min: 0 },
      loanEMI: { type: Number, default: 0, min: 0 },
      savingsContribution: { type: Number, default: 0, min: 0 },
      otherDeductions: { type: Number, default: 0, min: 0 },
    },

    gross: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ['draft', 'approved', 'paid'],
      default: 'draft',
    },
    paidAt: { type: Date },
    paymentMethod: {
      type: String,
      enum: ['bank', 'cash', 'cheque'],
      default: 'bank',
    },
    remarks: { type: String, default: '' },
    // Set when the loan-EMI deduction is actually settled against the loan.
    loanRepaymentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repayment',
      default: null,
    },
  },
  { timestamps: true },
);

// One payslip per employee per run.
payslipSchema.index({ employee: 1, payrollRun: 1 }, { unique: true });
payslipSchema.index({ user: 1, year: 1, month: 1 });
payslipSchema.index({ user: 1, employee: 1, createdAt: -1 });
payslipSchema.index({ payrollRun: 1, status: 1 });

applyMoneySetter(payslipSchema, [
  'earnings.basic',
  'earnings.hra',
  'earnings.medical',
  'earnings.transport',
  'earnings.otherAllowances',
  'earnings.overtime',
  'deductions.tax',
  'deductions.providentFund',
  'deductions.eobi',
  'deductions.loanEMI',
  'deductions.savingsContribution',
  'deductions.otherDeductions',
  'gross',
  'totalDeductions',
  'netPay',
]);

module.exports = mongoose.model('Payslip', payslipSchema);
