const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['income', 'expense', 'loan'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'repayment',
        'loan_disbursement',
        'investment',
        'withdrawal',
        'profit_distribution',
        'fee',
        'rent',
        'salary',
        'utilities',
        'marketing',
        'maintenance',
        'other',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      enum: [
        'Repayment',
        'Investment',
        'Loan',
        'User',
        'BusinessShare',
        'ProfitDistribution',
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster lookups
financialTransactionSchema.index({ user: 1, date: -1 });
financialTransactionSchema.index({ user: 1, category: 1 });
financialTransactionSchema.index({ user: 1, type: 1 });
financialTransactionSchema.index({ user: 1, type: 1, category: 1 });
financialTransactionSchema.index({ branchId: 1 });
financialTransactionSchema.index({ member: 1 });
financialTransactionSchema.index({ loan: 1 });
financialTransactionSchema.index({ referenceId: 1 });

module.exports = mongoose.model(
  'FinancialTransaction',
  financialTransactionSchema,
);
