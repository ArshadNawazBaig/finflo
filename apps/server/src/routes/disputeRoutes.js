const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const {
  createPortalDispute,
  listPortalDisputes,
  getPortalDispute,
  replyPortalDispute,
  getMemberUnreadCount,
  listDisputes,
  getDispute,
  updateDispute,
  replyDispute,
  getDisputeStats,
  getOwnerUnreadCount,
} = require('../controllers/disputeController');

// Member portal
router.post('/portal', protectMember, createPortalDispute);
router.get('/portal', protectMember, listPortalDisputes);
router.get('/portal/unread-count', protectMember, getMemberUnreadCount);
router.get('/portal/:id', protectMember, getPortalDispute);
router.post('/portal/:id/reply', protectMember, replyPortalDispute);

// Admin
router.get('/stats/summary', protect, admin, getDisputeStats);
router.get('/unread-count', protect, admin, getOwnerUnreadCount);
router.get('/', protect, admin, listDisputes);
router.get('/:id', protect, admin, getDispute);
router.patch('/:id', protect, admin, updateDispute);
router.post('/:id/reply', protect, admin, replyDispute);

module.exports = router;
