const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  previewBulkOperation,
  bulkApproveLoans,
  bulkNotifyMembers,
} = require('../controllers/bulkOperationsController');

router.post('/preview', protect, admin, previewBulkOperation);
router.post('/approve-loans', protect, admin, bulkApproveLoans);
router.post('/notify-members', protect, admin, bulkNotifyMembers);

module.exports = router;
