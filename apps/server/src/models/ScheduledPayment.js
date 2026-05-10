const mongoose = require('mongoose');

const scheduledPaymentSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    type: {
      type: String,
      required: true,
      enum: ['saving_deposit', 'loan_repayment'],
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    sourceAccount: {
      type: String,
      enum: ['current', 'saving'],
      default: 'current',
    },
    dayOfMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 28,
    },
    nextExecutionDate: {
      type: Date,
      required: true,
    },
    lastExecutedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'failed'],
      default: 'active',
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    maxExecutions: {
      type: Number,
      default: null,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      default: null,
    },
    failureReason: {
      type: String,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true },
);

scheduledPaymentSchema.index({ member: 1, status: 1 });
scheduledPaymentSchema.index({ nextExecutionDate: 1, status: 1 });

module.exports = mongoose.model('ScheduledPayment', scheduledPaymentSchema);
