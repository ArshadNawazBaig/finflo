const mongoose = require('mongoose');

const savingGoalSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      enum: [
        'emergency',
        'travel',
        'car',
        'education',
        'home',
        'wedding',
        'gadget',
        'other',
      ],
      default: 'other',
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    isPublic: {
      type: Boolean,
      default: false, // Could be used if members want to show off their progress to the admin
    },
    // ── Auto-contribute configuration ─────────────────────────────────────
    // Two modes can be active simultaneously. `roundup` is event-driven on
    // every member debit; `recurring` is monthly via the scheduled task.
    autoContribute: {
      roundup: {
        enabled: { type: Boolean, default: false },
        // Fixed at 10 for the MVP — every debit rounds up to the nearest 10.
        unit: { type: Number, default: 10 },
        sourceAccount: {
          type: String,
          enum: ['current', 'saving'],
          default: 'current',
        },
      },
      recurring: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0, min: 0 },
        // Monthly only for now — day-of-month the contribution should run.
        dayOfMonth: { type: Number, default: 1, min: 1, max: 28 },
        sourceAccount: {
          type: String,
          enum: ['current', 'saving'],
          default: 'current',
        },
        // Bookkeeping for the cron — prevents double-firing within a month.
        lastRunAt: { type: Date },
      },
    },
  },
  { timestamps: true },
);

// Virtual for progress percentage
savingGoalSchema.virtual('progress').get(function () {
  return Math.min(
    100,
    Math.round((this.currentAmount / this.targetAmount) * 100),
  );
});

savingGoalSchema.set('toJSON', { virtuals: true });
savingGoalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SavingGoal', savingGoalSchema);
