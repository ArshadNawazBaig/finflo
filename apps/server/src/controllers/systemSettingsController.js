const SystemSettings = require('../models/SystemSettings');
const { logActivity } = require('./activityLogController');

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
      'maxLoanLimits',
      'platformName',
      'platformDescription',
      'supportEmail',
      'maintenanceMode',
      'emailTemplates',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updatedBy = req.user._id;
    await settings.save();

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

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  resetToDefaults,
};
