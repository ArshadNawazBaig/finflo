const mongoose = require('mongoose');
const { applyMoneySetter } = require('../utils/money');

/**
 * PayrollTransaction — payroll's OWN money ledger, deliberately separate from
 * the business `FinancialTransaction` ledger. Salary disbursements are a payroll
 * concern, not part of the lending business's books, so they are NOT recorded in
 * FinancialTransaction (and therefore never bleed into the business P&L, balance
 * sheet, dashboard, or regulatory reports). One row per payslip actually paid.
 *
 * (Loan-EMI withheld from salary is a separate matter: that settles the
 * borrower's loan through loanRepaymentService and stays in the business ledger,
 * because collecting a loan IS the business's trade.)
 */
const payrollTransactionSchema = new mongoose.Schema(
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
    payrollRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: true,
    },
    payslip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payslip',
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    // Net cash disbursed to the employee (a payroll expense, isolated here).
    type: {
      type: String,
      enum: ['salary'],
      default: 'salary',
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    description: { type: String },
    paymentMethod: {
      type: String,
      enum: ['bank', 'cash', 'cheque'],
      default: 'bank',
    },
    status: {
      type: String,
      enum: ['completed', 'reversed'],
      default: 'completed',
    },
  },
  { timestamps: true },
);

// One payroll transaction per payslip — idempotent against a mark-paid retry.
payrollTransactionSchema.index({ payslip: 1 }, { unique: true });
payrollTransactionSchema.index({ user: 1, date: -1 });
payrollTransactionSchema.index({ user: 1, payrollRun: 1 });
payrollTransactionSchema.index({ user: 1, employee: 1, createdAt: -1 });
payrollTransactionSchema.index({ user: 1, branchId: 1 });

applyMoneySetter(payrollTransactionSchema, ['amount']);

module.exports = mongoose.model('PayrollTransaction', payrollTransactionSchema);
