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
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Reversed'],
      default: 'Completed',
    },
    reversedAt: { type: Date },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reversalReason: { type: String },
    reversalTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
    },
    originalTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
    },
    description: {
      type: String,
    },
    notes: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online'],
      default: 'cash',
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
        'Checkbook',
        'TermDeposit',
      ],
    },
    checkbookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Checkbook',
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

// ── AML Screening Hook ──────────────────────────────────────────────────────
// Automatically screen every new transaction through the AML monitoring engine.
// Runs asynchronously — never blocks the main transaction flow.
financialTransactionSchema.post('save', function (doc) {
  // Only screen new transactions (not updates)
  if (!doc.wasNew) return;

  // Lazy-load to avoid circular dependency
  setImmediate(async () => {
    try {
      const { screenTransaction } = require('../services/amlService');
      await screenTransaction(doc, {
        userId: doc.user,
        customerId: doc.customer || undefined,
        memberId: doc.member || undefined,
        branchId: doc.branchId || undefined,
      });
    } catch (error) {
      // Never let AML screening crash the application
      console.error('[AML] Post-save screening error:', error.message);
    }
  });
});

// Track if the document is newly created (for post-save hook)
financialTransactionSchema.pre('save', function () {
  this.wasNew = this.isNew;
});

module.exports = mongoose.model(
  'FinancialTransaction',
  financialTransactionSchema,
);
