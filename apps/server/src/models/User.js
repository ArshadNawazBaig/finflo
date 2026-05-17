const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getPasswordExpiryDate } = require('../utils/passwordPolicy');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, lowercase: true },
    email: {
      type: String,
      required: true,
      unique: true,
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
    googleId: { type: String, sparse: true, unique: true },
    isGoogleAuth: { type: Boolean, default: false },
    password: {
      type: String,
      required: function () {
        return !this.isGoogleAuth;
      },
      minlength: 8,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'staff', 'user'],
      default: 'admin',
    },
    roleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    // Cached branch manager status — updated when branch manager is assigned/removed.
    // Avoids a Branch.findOne() on every authenticated request for staff users.
    managedBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    businessName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    businessLogo: { type: String, default: '' },
    businessAddress: { type: String, default: '' },
    businessStamp: { type: String, default: '' },
    ceoSignature: { type: String, default: '' },
    // Tailwind-style HSL triplet ("H S% L%") for the business primary accent.
    // Synced into ThemeContext on login and broadcast via the
    // `business:branding_updated` socket event so every device follows the
    // tenant's brand color. Empty string falls back to the app default
    // (indigo). Hex equivalents are derived on the fly for email templates.
    primaryColor: { type: String, default: '' },
    currency: { type: String, default: 'Rs.' },
    businessAbbreviation: {
      type: String,
      maxlength: 4,
      uppercase: true,
      default: '',
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'incomplete'],
      default: 'active',
    },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangeCode: { type: String },
    passwordChangeCodeExpire: { type: Date },
    plan: { type: String, enum: ['Free', 'Basic', 'Pro'], default: 'Free' },
    customerCount: { type: Number, default: 0 },
    savingProfitRate: { type: Number, default: 0, min: 0, max: 100 }, // Annual profit rate % for saving accounts
    businessCapital: { type: Number, default: 0 }, // Owner's equity / capital balance

    // ── Per-Business Configurations ──────────────────────────────────
    // Checkbook – per-leaf pricing
    checkbookFee: { type: Number, default: 0, min: 0 }, // legacy flat fee (migration fallback)
    checkbookFees: {
      25:  { type: Number, default: 0, min: 0 },
      50:  { type: Number, default: 0, min: 0 },
      100: { type: Number, default: 0, min: 0 },
    },

    // Late Fee / Penalty
    lateFeeEnabled: { type: Boolean, default: false },
    lateFeeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    lateFeeRate: { type: Number, default: 0, min: 0 },
    lateFeeGracePeriodDays: { type: Number, default: 0, min: 0 },
    loanDefaultThresholdMonths: { type: Number, default: 3, min: 1, max: 24 },

    // Term Deposit
    termDepositRates: {
      type: [
        {
          duration: { type: Number, required: true },
          rate: { type: Number, required: true },
        },
      ],
      default: [],
    },
    termDepositEarlyBreakPenalty: { type: Number, default: 0, min: 0, max: 100 },

    nextBillingDate: { type: Date },
    paymentMethods: [
      {
        brand: String,
        last4: String,
        expiryMonth: Number,
        expiryYear: Number,
        isDefault: { type: Boolean, default: false },
      },
    ],
    invoices: [
      {
        id: String,
        date: Date,
        amount: Number,
        status: String,
        url: String,
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    securityCode: {
      type: String,
      sparse: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: String,
    verificationCodeExpire: Date,
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    onboardingStatus: {
      isCompleted: { type: Boolean, default: false },
      currentStep: { type: Number, default: 0 },
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // ── Bank-Grade Security Fields ───────────────────────────────────
    // Password Policy
    passwordHistory: {
      type: [
        {
          hash: { type: String, required: true },
          changedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false, // Never expose password hashes in queries
    },
    passwordExpiresAt: { type: Date },
    passwordChangedAt: { type: Date },

    // Session Management
    activeSessions: {
      type: [
        {
          tokenHash: { type: String, required: true }, // SHA-256 of JWT
          ip: { type: String },
          userAgent: { type: String },
          deviceName: { type: String },
          createdAt: { type: Date, default: Date.now },
          lastActiveAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false, // Don't include in default queries
    },
    maxConcurrentSessions: { type: Number, default: 5, min: 1, max: 20 },

    // IP Whitelisting
    ipWhitelist: {
      type: [String], // Supports IPs, CIDRs (192.168.1.0/24), wildcards (192.168.*.*)
      default: [],
    },
    ipWhitelistEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Generate unique security code
const generateSecurityCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

userSchema.pre('save', async function () {
  // Generate security code if not present (only for admins)
  if (!this.securityCode && this.role === 'admin') {
    let codeIsUnique = false;
    while (!codeIsUnique) {
      this.securityCode = generateSecurityCode();
      const existingUser = await mongoose
        .model('User')
        .findOne({ securityCode: this.securityCode });
      if (!existingUser) {
        codeIsUnique = true;
      }
    }
  }

  // Hash password if modified
  if (!this.isModified('password') || this.isGoogleAuth || !this.password)
    return;

  // Record old password in history before hashing the new one
  if (this.password && this._previousPassword) {
    // _previousPassword is set by the controller before changing
    const history = this.passwordHistory || [];
    history.unshift({ hash: this._previousPassword, changedAt: new Date() });
    // Keep only last 5
    this.passwordHistory = history.slice(0, 5);
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Set password expiry and change timestamp
  this.passwordChangedAt = new Date();
  this.passwordExpiresAt = getPasswordExpiryDate(90);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
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

userSchema.methods.getPermissions = function () {
  if (this.roleRef && this.roleRef.permissions) {
    return this.roleRef.permissions;
  }

  // Legacy fallback
  if (this.role === 'super_admin') return ['*'];
  if (this.role === 'admin') {
    return [
      'view_all',
      'manage_loans',
      'manage_members',
      'manage_branches',
      'view_reports',
      'manage_roles',
      'system_settings',
      // Operational permissions surfaced by the role-template flow. Admins
      // implicitly hold both so existing tenants don't lose access when the
      // new gates roll out.
      'process_transactions',
      'reverse_transactions',
    ];
  }
  if (this.role === 'staff') {
    return ['view_assigned', 'create_loan', 'create_member'];
  }
  if (this.role === 'user') {
    return ['view_own_data'];
  }

  return [];
};

module.exports = mongoose.model('User', userSchema);
