const SystemSettings = require('../models/SystemSettings');
const { logActivity } = require('./activityLogController');
const { invalidateSettingsCache } = require('../utils/email');
const { getEmailBranding } = require('../utils/brandingUtils');

// Get system settings
const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Failed to fetch system settings' });
  }
};

// Update system settings (Super Admin only)
const updateSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const oldSettings = settings.toObject();

    // Update fields
    const allowedFields = [
      'subscriptionPlans',
      'defaultInterestRate',
      'defaultLoanTerm',
      'currency',
      'maxLoanLimits',
      'platformName',
      'platformDescription',
      'supportEmail',
      'maintenanceMode',
      'estimatedMaintenanceTime',
      'emailTemplates',
      'smtpConfig',
      'checkbookFees',
      'lateFeeEnabled',
      'lateFeeType',
      'lateFeeRate',
      'lateFeeGracePeriodDays',
      'termDepositRates',
      'termDepositEarlyBreakPenalty',
      'partners',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updatedBy = req.user._id;
    await settings.save();
    SystemSettings.invalidateCache(); // Clear model-level cache
    invalidateSettingsCache(); // Clear SMTP/settings cache immediately

    // Log activity
    const changes = [];
    allowedFields.forEach((field) => {
      if (
        JSON.stringify(oldSettings[field]) !== JSON.stringify(settings[field])
      ) {
        changes.push(field);
      }
    });

    await logActivity({
      userId: req.user._id,
      action: 'system_settings_updated',
      category: 'admin',
      details: `Admin updated system settings: ${changes.join(', ')}`,
      metadata: { changes },
      req,
    });

    res.json({
      message: 'System settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ message: 'Failed to update system settings' });
  }
};

// Reset to default settings (Super Admin only)
const resetToDefaults = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    // Delete and recreate with defaults
    await SystemSettings.deleteMany({});
    const newSettings = await SystemSettings.create({
      updatedBy: req.user._id,
    });
    SystemSettings.invalidateCache(); // Clear model-level cache
    invalidateSettingsCache(); // Clear SMTP/settings cache immediately

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'system_settings_reset',
      category: 'admin',
      details: 'Admin reset system settings to defaults',
      req,
    });

    res.json({
      message: 'System settings reset to defaults',
      settings: newSettings,
    });
  } catch (error) {
    console.error('Error resetting system settings:', error);
    res.status(500).json({ message: 'Failed to reset system settings' });
  }
};

// Update loan configuration (Admins + Super Admins)
const updateLoanConfiguration = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const oldSettings = settings.toObject();

    // Global fields still go to SystemSettings
    const globalFields = [
      'defaultInterestRate',
      'defaultLoanTerm',
      'currency',
    ];

    globalFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updatedBy = req.user._id;
    await settings.save();

    // Per-business fields go to the User model
    const perBusinessFields = [
      'checkbookFees',
      'lateFeeEnabled',
      'lateFeeType',
      'lateFeeRate',
      'lateFeeGracePeriodDays',
      'loanDefaultThresholdMonths',
      'termDepositRates',
      'termDepositEarlyBreakPenalty',
    ];

    const User = require('../models/User');
    const adminId = req.user.effectiveOwnerId || req.user._id;
    const updateObj = {};

    perBusinessFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateObj[field] = req.body[field];
      }
    });

    if (Object.keys(updateObj).length > 0) {
      await User.findByIdAndUpdate(adminId, { $set: updateObj });
    }

    // Reload admin for response
    const adminUser = await User.findById(adminId).select(
      perBusinessFields.join(' ')
    );

    await logActivity({
      userId: req.user._id,
      action: 'loan_config_updated',
      category: 'admin',
      details: `Admin updated loan configuration. Interest Rate: ${settings.defaultInterestRate}%`,
      req,
    });

    res.json({
      message: 'Loan configuration updated successfully',
      settings: {
        ...settings.toObject(),
        // Overlay per-business fields so the frontend gets a unified response
        ...(adminUser ? adminUser.toObject() : {}),
      },
    });
  } catch (error) {
    console.error('Error updating loan configuration:', error);
    res.status(500).json({ message: 'Failed to update loan configuration' });
  }
};

// Test email connection and send a test email (supports Resend + SMTP)
const testSmtpConnection = async (req, res) => {
  try {
    const { sendEmail } = require('../utils/email');
    const { to } = req.body;

    if (!to) {
      return res
        .status(400)
        .json({ message: 'Recipient email (to) is required' });
    }

    const { brandName } = await getEmailBranding(req.user, null);
    const success = await sendEmail({
      to,
      debug: true, // Enable detailed SMTP logging for diagnostics
      subject: `${brandName} SMTP Connection Test`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">SMTP Test Successful!</h2>
          <p style="color: #475569;">If you are reading this, your ${brandName} SMTP configuration (from DB or Env) is working correctly.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Sent on: ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: `SMTP Test Successful! Your ${brandName} configuration is working correctly.`,
    });

    if (success) {
      res.json({
        message: `Email sent successfully via SMTP`,
      });
    } else {
      res.status(500).json({
        message: 'Email delivery failed. Check server logs for details.',
      });
    }
  } catch (error) {
    console.error('Email Test Error:', error);
    res
      .status(500)
      .json({ message: 'Email test failed', error: error.message });
  }
};

// Get per-business configuration (merged with global defaults)
const getBusinessConfig = async (req, res) => {
  try {
    const User = require('../models/User');
    const adminId = req.user.effectiveOwnerId || req.user._id;
    const adminUser = await User.findById(adminId).select(
      'checkbookFee checkbookFees lateFeeEnabled lateFeeType lateFeeRate lateFeeGracePeriodDays loanDefaultThresholdMonths termDepositRates termDepositEarlyBreakPenalty'
    );

    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Also return global defaults for context
    const settings = await SystemSettings.getSettings();

    res.json({
      // Global fields
      defaultInterestRate: settings.defaultInterestRate,
      defaultLoanTerm: settings.defaultLoanTerm,
      currency: settings.currency,
      // Per-business fields (from User)
      checkbookFees: adminUser.checkbookFees && (adminUser.checkbookFees[25] || adminUser.checkbookFees[50] || adminUser.checkbookFees[100])
        ? { 25: adminUser.checkbookFees[25] ?? 0, 50: adminUser.checkbookFees[50] ?? 0, 100: adminUser.checkbookFees[100] ?? 0 }
        : { 25: adminUser.checkbookFee ?? 0, 50: adminUser.checkbookFee ?? 0, 100: adminUser.checkbookFee ?? 0 },
      lateFeeEnabled: adminUser.lateFeeEnabled ?? false,
      lateFeeType: adminUser.lateFeeType || 'fixed',
      lateFeeRate: adminUser.lateFeeRate ?? 0,
      lateFeeGracePeriodDays: adminUser.lateFeeGracePeriodDays ?? 0,
      loanDefaultThresholdMonths: adminUser.loanDefaultThresholdMonths ?? 3,
      termDepositRates: adminUser.termDepositRates || [],
      termDepositEarlyBreakPenalty: adminUser.termDepositEarlyBreakPenalty ?? 0,
    });
  } catch (error) {
    console.error('Error fetching business config:', error);
    res.status(500).json({ message: 'Failed to fetch business configuration' });
  }
};

// Get business config for member portal (resolves from member's business owner)
const getMemberBusinessConfig = async (req, res) => {
  try {
    const User = require('../models/User');

    // req.member is set by protectMember middleware
    const ownerId = req.member?.user;
    if (!ownerId) {
      return res.status(400).json({ message: 'Member has no associated business' });
    }

    const adminUser = await User.findById(ownerId).select(
      'checkbookFee checkbookFees lateFeeEnabled lateFeeType lateFeeRate lateFeeGracePeriodDays loanDefaultThresholdMonths termDepositRates termDepositEarlyBreakPenalty currency'
    );

    if (!adminUser) {
      return res.status(404).json({ message: 'Business owner not found' });
    }

    res.json({
      currency: adminUser.currency || 'Rs.',
      checkbookFees: adminUser.checkbookFees && (adminUser.checkbookFees[25] || adminUser.checkbookFees[50] || adminUser.checkbookFees[100])
        ? { 25: adminUser.checkbookFees[25] ?? 0, 50: adminUser.checkbookFees[50] ?? 0, 100: adminUser.checkbookFees[100] ?? 0 }
        : { 25: adminUser.checkbookFee ?? 0, 50: adminUser.checkbookFee ?? 0, 100: adminUser.checkbookFee ?? 0 },
      lateFeeEnabled: adminUser.lateFeeEnabled ?? false,
      lateFeeType: adminUser.lateFeeType || 'fixed',
      lateFeeRate: adminUser.lateFeeRate ?? 0,
      lateFeeGracePeriodDays: adminUser.lateFeeGracePeriodDays ?? 0,
      loanDefaultThresholdMonths: adminUser.loanDefaultThresholdMonths ?? 3,
      termDepositRates: adminUser.termDepositRates || [],
      termDepositEarlyBreakPenalty: adminUser.termDepositEarlyBreakPenalty ?? 0,
    });
  } catch (error) {
    console.error('Error fetching member business config:', error);
    res.status(500).json({ message: 'Failed to fetch business configuration' });
  }
};

// Upload partner logo (Super Admin only)
const uploadPartnerLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file provided' });
    }

    res.json({
      success: true,
      logoUrl: req.file.path, // Cloudinary URL
      message: 'Partner logo uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading partner logo:', error);
    res.status(500).json({ message: 'Failed to upload partner logo' });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  updateLoanConfiguration,
  getBusinessConfig,
  getMemberBusinessConfig,
  resetToDefaults,
  testSmtpConnection,
  uploadPartnerLogo,
};
