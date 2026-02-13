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
