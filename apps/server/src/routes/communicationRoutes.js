const express = require('express');
const router = express.Router();
const {
  triggerScan,
  sendBulkEmailMembers,
} = require('../controllers/communicationController');
const { protect, admin } = require('../middleware/authMiddleware');
const { applyLateFees } = require('../services/lateFeeService');

router.post('/trigger-scan', protect, admin, triggerScan);
router.post('/bulk-email-members', protect, sendBulkEmailMembers);

// Late fee scan endpoint
router.post('/apply-late-fees', protect, admin, async (req, res) => {
  try {
    const result = await applyLateFees(req);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Late Fee Scan Error:', error);
    res.status(500).json({ message: 'Failed to apply late fees' });
  }
});

module.exports = router;
