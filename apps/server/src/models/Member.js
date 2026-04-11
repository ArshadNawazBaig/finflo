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
    password: {
      type: String,
      required: function () {
        return !this.isGoogleAuth;
      },
      minlength: 8,
    },
    googleId: { type: String, sparse: true, unique: true },
    isGoogleAuth: { type: Boolean, default: false },
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
    creditLimit: { type: Number, default: 0 },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangeCode: { type: String },
    passwordChangeCodeExpire: { type: Date },
    // Business Share (separate from main balance – never auto-deducted for loans)
    shareBalance: { type: Number, default: 0 },
    totalShareInvested: { type: Number, default: 0 },
    totalShareProfit: { type: Number, default: 0 },
    shareProfitRate: { type: Number, default: 0 }, // Custom profit rate for shares
    // Saving Account (separate from main balance — earns daily profit)
    savingBalance: { type: Number, default: 0 },
    pendingSavingProfit: { type: Number, default: 0 }, // Accrued daily, distributed monthly
    totalSavingDeposited: { type: Number, default: 0 },
    totalSavingWithdrawn: { type: Number, default: 0 },
    totalSavingProfit: { type: Number, default: 0 },
    lastSavingProfitAt: { type: Date }, // De-dupe daily cron
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
    rejectionReason: {
      type: String,
      default: '',
    },
    cnic: { type: String, required: true },
    job: { type: String },
    jobDetail: { type: String },
    monthlyIncome: { type: Number },
    signature: { type: String, default: '' },
    savingAccountNumber: { type: String, sparse: true },
    currentAccountNumber: { type: String, sparse: true },
    loanAccountNumber: { type: String, sparse: true },
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
    onboardingStatus: {
      isCompleted: { type: Boolean, default: false },
      currentStep: { type: Number, default: 0 },
    },
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
  if (!this.savingAccountNumber || !this.currentAccountNumber) {
    const User = mongoose.model('User');
    const user = await User.findById(this.user);
    const abbr = user?.businessAbbreviation || '';
    const count = (user?.customerCount || 0) + 100001;

    // Helper to generate account number: [ABBR]-[TYPE_INITIAL]-[COUNT][RANDOM] e.g. MLO-S-100001xxx
    const generateAcc = (prefix) => {
      const typeInitial = String(prefix).charAt(0).toUpperCase();
      const prefixStr = abbr ? `${abbr.toUpperCase()}-${typeInitial}` : prefix.toUpperCase();
      const base = `${prefixStr}-${count}`;
      const remaining = 13 - base.length;
      let randomDigits = '';
      if (remaining > 0) {
        for (let i = 0; i < remaining; i++) {
          randomDigits += Math.floor(Math.random() * 10);
        }
      }
      return `${base}${randomDigits}`;
    };

    if (!this.savingAccountNumber) {
      this.savingAccountNumber = generateAcc('SAV');
    }
    if (!this.currentAccountNumber) {
      this.currentAccountNumber = generateAcc('CUR');
    }
    if (!this.loanAccountNumber) {
      this.loanAccountNumber = generateAcc('LON');
    }
  }

  if (!this.password || !this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
memberSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
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
