const mongoose = require('mongoose');

const denominationSchema = new mongoose.Schema(
  {
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const cashOpeningSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    denominations: {
      d10: { type: Number, default: 0 },
      d20: { type: Number, default: 0 },
      d50: { type: Number, default: 0 },
      d100: { type: Number, default: 0 },
      d500: { type: Number, default: 0 },
      d1000: { type: Number, default: 0 },
      d5000: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// One opening per user per day
cashOpeningSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CashOpening', cashOpeningSchema);
