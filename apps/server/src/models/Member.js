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
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    name: { type: String, lowercase: true }, // Name now optional based on user feedback
    email: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          const { validateEmail } = require('../utils/emailValidator');
          return validateEmail(v).isValid;
        },
        message: (props) => {
          const { validateEmail } = require('../utils/emailValidator');
          return validateEmail(props.value).message;
        },
      },
    },
    phone: { type: String, required: true },
    password: { type: String, required: true, minlength: 8 },
    role: {
      type: String,
      default: 'member',
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    profilePicture: { type: String },
    address: { type: String },
    totalInvested: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    profitRate: { type: Number, default: 0 }, // Custom profit rate if needed
    mustChangePassword: { type: Boolean, default: false },
    passwordChangeCode: { type: String },
    passwordChangeCodeExpire: { type: Date },
    // Business Share (separate from main balance – never auto-deducted for loans)
    shareBalance: { type: Number, default: 0 },
    totalShareInvested: { type: Number, default: 0 },
    totalShareProfit: { type: Number, default: 0 },
    shareProfitRate: { type: Number, default: 0 }, // Custom profit rate for shares
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    cnic: { type: String, required: true },
    job: { type: String },
    monthlyIncome: { type: Number },
    savingAccountNumber: { type: String, sparse: true },
    currentAccountNumber: { type: String, sparse: true },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    joinDate: { type: Date, default: Date.now },
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes for performance
memberSchema.index({ user: 1 });
memberSchema.index({ branchId: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ approvalStatus: 1 });
memberSchema.index({ user: 1, cnic: 1 }, { unique: true });

// Hash password before saving
memberSchema.pre('save', async function () {
  // Generate account numbers if missing
  if (!this.savingAccountNumber) {
    this.savingAccountNumber =
      'SAV-' + Math.floor(Math.random() * 9000000000 + 1000000000);
  }
  if (!this.currentAccountNumber) {
    this.currentAccountNumber =
      'CUR-' + Math.floor(Math.random() * 9000000000 + 1000000000);
  }

  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
memberSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
memberSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = require('crypto').randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

module.exports = mongoose.model('Member', memberSchema);
