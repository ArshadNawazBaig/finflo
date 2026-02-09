const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    totalInvested: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    profitRate: { type: Number, default: 0 }, // Custom profit rate if needed
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Prevent duplicate emails per user
memberSchema.index({ user: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Member', memberSchema);
