const express = require('express');
const router = express.Router();
const {
  getSystemSettings,
  updateSystemSettings,
  updateLoanConfiguration,
  getBusinessConfig,
  getMemberBusinessConfig,
  resetToDefaults,
  testSmtpConnection,
} = require('../controllers/systemSettingsController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');

// Public route - anyone can view basic settings
router.get('/', getSystemSettings);

// Per-business config (admin/staff) — returns config for the calling user's business
router.get('/business-config', protect, getBusinessConfig);

// Member-facing — returns the member's business owner's config
router.get('/member-business-config', protectMember, getMemberBusinessConfig);

// Protected routes - super admin only
router.put('/', protect, superAdminProtect, updateSystemSettings);
router.post('/reset', protect, superAdminProtect, resetToDefaults);
router.post('/test-connection', protect, superAdminProtect, testSmtpConnection);

// Protected routes - admin & super admin
router.put('/loan-configuration', protect, updateLoanConfiguration);

module.exports = router;
