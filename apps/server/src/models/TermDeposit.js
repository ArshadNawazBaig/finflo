const mongoose = require('mongoose');

const termDepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    depositNumber: {
      type: String,
      unique: true,
    },
    principal: {
      type: Number,
      required: true,
      min: 1,
    },
    profitRate: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      enum: [3, 6, 12, 18, 24],
    },
    sourceAccount: {
      type: String,
      enum: ['current', 'saving'],
      default: 'current',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    maturityDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'matured', 'broken', 'withdrawn'],
      default: 'active',
    },
    projectedProfit: {
      type: Number,
      default: 0,
    },
    actualProfit: {
      type: Number,
      default: 0,
    },
    earlyBreakPenaltyRate: {
      type: Number,
      default: 50, // % of profit forfeited on early break
    },
    maturedAt: { type: Date },
    brokenAt: { type: Date },
    withdrawnAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

// Auto-generate deposit number
termDepositSchema.pre('save', async function () {
  if (!this.depositNumber) {
    const count = await mongoose.model('TermDeposit').countDocuments();
    this.depositNumber = `TD-${String(count + 10001).padStart(5, '0')}`;
  }
});

termDepositSchema.index({ user: 1 });
termDepositSchema.index({ member: 1 });
termDepositSchema.index({ status: 1 });
termDepositSchema.index({ maturityDate: 1 });

module.exports = mongoose.model('TermDeposit', termDepositSchema);
