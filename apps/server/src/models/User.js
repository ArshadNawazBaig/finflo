const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    password: { type: String, required: true, minlength: 8 },
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
    businessName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
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
  },
  { timestamps: true },
);

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ email: 1 });
userSchema.index({ securityCode: 1 });

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
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
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
