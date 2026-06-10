const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptFields, decryptFields } = require('../utils/encryption');

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
    transferLimitTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransferLimitTier',
      default: null, // null falls back to the tenant's 'standard' tier
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
    // Cumulative loan principal disbursed into the current-account wallet. Kept
    // separate from totalInvested (genuine member capital) so reports don't count
    // borrowed money as deposits. It still backs currentBalance:
    // currentBalance = totalInvested + totalLoanProceeds − totalWithdrawn + totalProfit.
    totalLoanProceeds: { type: Number, default: 0 },
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
    cnicHash: { type: String, index: true }, // SHA-256 hash for searchable lookups
    job: { type: String },
    jobDetail: { type: String },
    monthlyIncome: { type: Number },
    signature: { type: String, default: '' },
    savingAccountNumber: { type: String, sparse: true },
    currentAccountNumber: { type: String, sparse: true },
    loanAccountNumber: { type: String, sparse: true },
    nominee: {
      name: { type: String, default: '' },
      cnic: { type: String, default: '' },
      relation: { type: String, default: '' },
      cnicImage: { type: String, default: '' },
    },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        // KYC categories surface in the verification queue UI; admins/staff
        // approve, reject, or mark expired. Selfie covers liveness checks
        // for high-risk onboarding flows.
        type: {
          type: String,
          enum: [
            'CNIC',
            'Selfie',
            'Utility Bill',
            'Tax Return',
            'Proof of Residence',
            'Other',
          ],
          default: 'Other',
        },
        status: {
          type: String,
          enum: ['Pending', 'Verified', 'Rejected', 'Expired'],
          default: 'Pending',
        },
        expiryDate: { type: Date },
        isEncrypted: { type: Boolean, default: false },
        rejectionReason: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
        verifiedAt: { type: Date },
        // Cron stamps these so the daily expiry scan doesn't re-fire the
        // same reminder every night. Cleared on re-upload (new url).
        expiryReminder30dSentAt: { type: Date },
        expiryReminder7dSentAt: { type: Date },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    joinDate: { type: Date, default: Date.now },
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    // Brute-force lockout (mirrors the User side). Without these fields declared,
    // Mongoose strict mode silently strips the $set in loginMember, so the lockout
    // never persisted — a member account could be brute-forced indefinitely.
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    onboardingStatus: {
      isCompleted: { type: Boolean, default: false },
      currentStep: { type: Number, default: 0 },
    },
    notificationPreferences: {
      email: {
        loanUpdates: { type: Boolean, default: true },
        paymentReminders: { type: Boolean, default: true },
        profitCredits: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
      },
      inApp: {
        loanUpdates: { type: Boolean, default: true },
        paymentReminders: { type: Boolean, default: true },
        profitCredits: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
      },
    },

    // Transaction PIN for sensitive operations
    transactionPin: { type: String, select: false }, // bcrypt-hashed 4-digit PIN
    transactionPinSetAt: { type: Date },
    pinFailedAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date },
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
  if (
    !this.savingAccountNumber ||
    !this.currentAccountNumber ||
    !this.loanAccountNumber
  ) {
    const User = mongoose.model('User');
    const user = await User.findById(this.user);
    const abbr = user?.businessAbbreviation || '';
    const count = (user?.customerCount || 0) + 100001;

    // Helper to generate account number: [ABBR]-[TYPE_INITIAL]-[COUNT][RANDOM] e.g. MLO-S-100001xxx
    const generateAcc = (prefix) => {
      const typeInitial = String(prefix).charAt(0).toUpperCase();
      const prefixStr = abbr
        ? `${abbr.toUpperCase()}-${typeInitial}`
        : prefix.toUpperCase();
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

// ── Default Transfer Limit Tier ──────────────────────────────────────────────
// Every newly-created member starts on the tenant's Basic tier. We seed the
// tier set on first use and look up the basic slot lazily so this hook stays
// safe even before an admin has visited the Transfer Limits page.
memberSchema.pre('save', async function () {
  if (!this.isNew || this.transferLimitTier) return;
  try {
    const {
      ensureSeededTiers,
    } = require('../services/transferLimits');
    const TransferLimitTier = require('./TransferLimitTier');
    await ensureSeededTiers(this.user);
    const basic = await TransferLimitTier.findOne({
      user: this.user,
      slot: 'basic',
    });
    if (basic) this.transferLimitTier = basic._id;
  } catch (err) {
    // Never block member creation on a tier-defaulting failure — the
    // member can still be created and assigned a tier later.
    console.warn('[Member] tier defaulting failed:', err.message);
  }
});

// ── PII Encryption Hooks ─────────────────────────────────────────────────────
// Encrypt PII fields before saving to database
memberSchema.pre('save', function () {
  encryptFields(this, ['cnic', 'phone', 'address'], ['cnicHash', null, null]);
});

// Decrypt PII fields after reading from database
const decryptMemberPII = (doc) => {
  if (!doc) return;
  decryptFields(doc, ['cnic', 'phone', 'address']);
};

memberSchema.post('findOne', decryptMemberPII);
memberSchema.post('findById', decryptMemberPII);
memberSchema.post('save', decryptMemberPII);
memberSchema.post('find', (docs) => {
  if (Array.isArray(docs)) docs.forEach(decryptMemberPII);
});

module.exports = mongoose.model('Member', memberSchema);
