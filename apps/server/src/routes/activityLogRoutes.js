const express = require('express');
const router = express.Router();
const {
  getAllActivityLogs,
  getUserActivityLogs,
} = require('../controllers/activityLogController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');

// All routes require super admin authentication
router.use(protect);
router.use(superAdminProtect);

router.get('/', getAllActivityLogs);
router.get('/user/:userId', getUserActivityLogs);

module.exports = router;
