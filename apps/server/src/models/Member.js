const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    password: { type: String, required: true },
    role: {
      type: String,
      default: 'member',
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
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
    cnic: { type: String },
    job: { type: String },
    monthlyIncome: { type: Number },
    accountNumber: { type: String, unique: true, sparse: true },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Prevent duplicate emails per user
memberSchema.index({ user: 1, email: 1 }, { unique: true });

// Hash password before saving
memberSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
memberSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Member', memberSchema);
