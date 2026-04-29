const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Some actions might not have a user (e.g., failed login)
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'auth',
        'user',
        'loan',
        'customer',
        'member',
        'notification',
        'admin',
        'support',
        'branch',
        'investment',
        'repayment',
        'loan_disbursement',
        'withdrawal',
        'profit_distribution',
        'profit',
        'goal',
        'transaction',
        'system',
        'security',
        'compliance',
        'aml',
        'other',
      ],
      index: true,
    },
    details: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
