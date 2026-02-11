const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'user'],
      default: 'admin',
    },
    businessName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'incomplete'],
      default: 'active',
    },
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
      unique: true,
      sparse: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
  },
  { timestamps: true },
);

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
  // Generate security code if not present
  if (!this.securityCode) {
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

module.exports = mongoose.model('User', userSchema);
