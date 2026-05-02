const express = require('express');
const router = express.Router();
const {
  issueCheckbook,
  getMemberCheckbooks,
  getPortalCheckbooks,
  cancelCheckbook,
  updateCheckbookStatus,
} = require('../controllers/checkbookController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');

// Member Portal route (self-access) — defined BEFORE admin protection
router.get('/portal', protectMember, getPortalCheckbooks);

// All subsequent routes require staff/admin authentication
router.use(protect);

// Issue a checkbook to a member
router.post('/issue', issueCheckbook);

// Get checkbooks for a specific member
router.get('/member/:memberId', getMemberCheckbooks);

// Cancel a checkbook
router.put('/:id/cancel', cancelCheckbook);

// Update checkbook status (reactivate, mark used, etc.)
router.put('/:id/status', updateCheckbookStatus);

module.exports = router;
