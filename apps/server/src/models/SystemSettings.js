const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Free', 'Basic', 'Pro'],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    default: '',
  },
  features: [String],
  limits: {
    maxCustomers: {
      type: Number,
      required: true,
      default: -1, // -1 means unlimited
    },
    maxLoans: {
      type: Number,
      required: true,
      default: -1,
    },
    maxMembers: {
      type: Number,
      required: true,
      default: -1,
    },
    maxBranches: {
      type: Number,
      required: true,
      default: -1,
    },
  },
});

const systemSettingsSchema = new mongoose.Schema(
  {
    // Subscription Plans
    subscriptionPlans: {
      type: [subscriptionPlanSchema],
      default: [
        {
          name: 'Free',
          price: 0,
          description: 'Perfect for getting started',
          features: [
            'Up to 10 customers',
            'Up to 5 active loans',
            'Basic reporting',
            '1 team member',
          ],
          limits: {
            maxCustomers: 10,
            maxLoans: 5,
            maxMembers: 1,
            maxBranches: 1,
          },
        },
        {
          name: 'Basic',
          price: 29,
          description: 'For growing businesses',
          features: [
            'Up to 100 customers',
            'Up to 50 active loans',
            'Advanced reporting',
            'Up to 3 team members',
            'Email support',
          ],
          limits: {
            maxCustomers: 100,
            maxLoans: 50,
            maxMembers: 3,
            maxBranches: 3,
          },
        },
        {
          name: 'Pro',
          price: 100,
          description: 'For established businesses',
          features: [
            'Unlimited customers',
            'Unlimited loans',
            'Premium reporting & analytics',
            'Unlimited team members',
            'Priority support',
            'Custom branding',
          ],
          limits: {
            maxCustomers: -1,
            maxLoans: -1,
            maxMembers: -1,
            maxBranches: -1,
          },
        },
      ],
    },

    // Default Values
    defaultInterestRate: {
      type: Number,
      default: 10.0,
      min: 0,
      max: 100,
    },
    defaultLoanTerm: {
      type: Number,
      default: 12,
      min: 1,
    },
    currency: {
      type: String,
      default: 'Rs.',
    },
    maxLoanLimits: {
      Free: {
        type: Number,
        default: 10000,
      },
      Basic: {
        type: Number,
        default: 50000,
      },
      Pro: {
        type: Number,
        default: -1, // unlimited
      },
    },

    // Checkbook Configuration – per-leaf pricing
    checkbookFees: {
      25:  { type: Number, default: 200, min: 0 },
      50:  { type: Number, default: 350, min: 0 },
      100: { type: Number, default: 500, min: 0 },
    },

    // Late Fee / Penalty Configuration
    lateFeeEnabled: {
      type: Boolean,
      default: true,
    },
    lateFeeType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    lateFeeRate: {
      type: Number,
      default: 500,
      min: 0,
    },
    lateFeeGracePeriodDays: {
      type: Number,
      default: 3,
      min: 0,
    },

    // Term Deposit Configuration
    termDepositRates: {
      type: [
        {
          duration: { type: Number, required: true }, // months
          rate: { type: Number, required: true }, // annual %
        },
      ],
      default: [
        { duration: 3, rate: 6 },
        { duration: 6, rate: 8 },
        { duration: 12, rate: 10 },
        { duration: 18, rate: 11 },
        { duration: 24, rate: 12 },
      ],
    },
    termDepositEarlyBreakPenalty: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // Platform Configuration
    platformName: {
      type: String,
      default: 'FinFlo',
    },
    platformDescription: {
      type: String,
      default: 'Professional FinFlo platform for businesses',
    },
    supportEmail: {
      type: String,
      default: 'support@finflo.org',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    estimatedMaintenanceTime: {
      type: String,
      default: '25 mins',
    },

    // SMTP Settings
    smtpConfig: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      auth: {
        user: { type: String, default: '' },
        pass: { type: String, default: '' },
      },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: '' },
    },

    // Email Templates (for future use)
    emailTemplates: {
      welcome: {
        type: String,
        default: "Welcome to {{platformName}}! We're excited to have you.",
      },
      passwordReset: {
        type: String,
        default: 'Click here to reset your password: {{resetLink}}',
      },
      loanApproved: {
        type: String,
        default: 'Your loan has been approved!',
      },
    },

    // Partners
    partners: {
      type: [
        {
          name: { type: String, required: true },
          logoUrl: { type: String, default: '' },
          active: { type: Boolean, default: true },
        },
      ],
      default: [
        { name: 'NORTHSPEX', logoUrl: '', active: true },
        { name: 'CALIBREON', logoUrl: '', active: true },
        { name: 'MICRO LOANS', logoUrl: '', active: true },
        { name: 'APEX FUND', logoUrl: '', active: true },
      ],
    },

    // ── Compliance & Security Configuration ──────────────────────────
    compliance: {
      ctrThreshold: { type: Number, default: 2000000 }, // PKR 2M for CTR auto-generation
      sarAutoEscalationDays: { type: Number, default: 3 }, // Auto-escalate unreviewed SARs
      passwordExpiryDays: { type: Number, default: 90 },
      maxConcurrentSessions: { type: Number, default: 5 },
      sessionTimeoutMinutes: { type: Number, default: 30 },
      ipWhitelistEnabled: { type: Boolean, default: false },
      dataRetentionYears: { type: Number, default: 10 }, // SBP minimum 10 years
      amlEnabled: { type: Boolean, default: true },
      encryptionEnabled: { type: Boolean, default: true },
    },

    // Metadata
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

// Module-level cache — one DB query per minute maximum across all callers
let _settingsCache = null;
let _settingsCacheExpiresAt = 0;
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function () {
  // Return cached value immediately if still fresh
  if (_settingsCache && Date.now() < _settingsCacheExpiresAt) {
    return _settingsCache;
  }

  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }

  _settingsCache = settings;
  _settingsCacheExpiresAt = Date.now() + SETTINGS_CACHE_TTL_MS;
  return settings;
};

// Call this whenever settings are mutated so cache is immediately invalidated
systemSettingsSchema.statics.invalidateCache = function () {
  _settingsCache = null;
  _settingsCacheExpiresAt = 0;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
