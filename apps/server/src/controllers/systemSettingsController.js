const SystemSettings = require('../models/SystemSettings');
const { logActivity } = require('./activityLogController');
const { invalidateSettingsCache } = require('../utils/email');

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
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updatedBy = req.user._id;
    await settings.save();
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

    if (req.body.defaultInterestRate !== undefined) {
      settings.defaultInterestRate = req.body.defaultInterestRate;
    }

    if (req.body.defaultLoanTerm !== undefined) {
      settings.defaultLoanTerm = req.body.defaultLoanTerm;
    }

    if (req.body.currency !== undefined) {
      settings.currency = req.body.currency;
    }

    settings.updatedBy = req.user._id;
    await settings.save();

    await logActivity({
      userId: req.user._id,
      action: 'loan_config_updated',
      category: 'admin',
      details: `Admin updated loan configuration. Interest Rate: ${settings.defaultInterestRate}%`,
      req,
    });

    res.json({
      message: 'Loan configuration updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating loan configuration:', error);
    res.status(500).json({ message: 'Failed to update loan configuration' });
  }
};

// Test SMTP connection and send a test email
const testSmtpConnection = async (req, res) => {
  try {
    const { sendEmail } = require('../utils/email');
    const { to } = req.body;

    if (!to) {
      return res
        .status(400)
        .json({ message: 'Recipient email (to) is required' });
    }

    const success = await sendEmail({
      to,
      subject: 'FinanceFlow SMTP Connection Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">SMTP Test Successful!</h2>
          <p style="color: #475569;">If you are reading this, your FinanceFlow SMTP configuration (from DB or Env) is working correctly.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Sent on: ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: 'SMTP Test Successful! Your FinanceFlow configuration is working correctly.',
    });

    if (success) {
      res.json({
        message: 'SMTP connection verified and test email sent successfully',
      });
    } else {
      res.status(500).json({ message: 'SMTP verification failed' });
    }
  } catch (error) {
    console.error('SMTP Test Error:', error);
    res.status(500).json({ message: 'SMTP test failed', error: error.message });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  updateLoanConfiguration,
  resetToDefaults,
  testSmtpConnection,
};
