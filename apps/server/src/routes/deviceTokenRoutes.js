const express = require('express');
const router = express.Router();
const {
  registerDeviceToken,
  unregisterDeviceToken,
} = require('../controllers/deviceTokenController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');

// Member app (end-customers)
router.post('/register', protectMember, registerDeviceToken);
router.post('/unregister', protectMember, unregisterDeviceToken);

// Business app (staff/admin users)
router.post('/staff/register', protect, registerDeviceToken);
router.post('/staff/unregister', protect, unregisterDeviceToken);

module.exports = router;
