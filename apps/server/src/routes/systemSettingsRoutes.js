const express = require('express');
const router = express.Router();
const {
  getSystemSettings,
  updateSystemSettings,
  resetToDefaults,
} = require('../controllers/systemSettingsController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');

// Public route - anyone can view basic settings
router.get('/', getSystemSettings);

// Protected routes - super admin only
router.put('/', protect, superAdminProtect, updateSystemSettings);
router.post('/reset', protect, superAdminProtect, resetToDefaults);

module.exports = router;
