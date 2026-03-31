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

    // Checkbook Configuration
    checkbookFee: {
      type: Number,
      default: 250,
      min: 0,
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

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
