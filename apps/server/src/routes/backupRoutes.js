const express = require('express');
const router = express.Router();
const {
  exportUsers,
  exportLoans,
  exportRepayments,
  exportCustomers,
  exportActivityLogs,
} = require('../controllers/backupController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');

// All routes require super admin authentication
router.use(protect);
router.use(superAdminProtect);

router.get('/export/users', exportUsers);
router.get('/export/loans', exportLoans);
router.get('/export/repayments', exportRepayments);
router.get('/export/customers', exportCustomers);
router.get('/export/activity-logs', exportActivityLogs);

module.exports = router;
