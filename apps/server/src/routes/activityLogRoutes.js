const express = require('express');
const router = express.Router();
const {
  getAllActivityLogs,
  getUserActivityLogs,
} = require('../controllers/activityLogController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');

// Routes for Activity Logs
router.use(protect);

// Regular admins can see their team logs, Super admins see everything
router.get('/', getAllActivityLogs);
router.get('/user/:userId', superAdminProtect, getUserActivityLogs);

module.exports = router;
