const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
} = require('../controllers/notificationController');
const { protectMember } = require('../middleware/memberAuthMiddleware');

// Authenticated Members
router.get('/', protectMember, getMyNotifications);
router.put('/:id/read', protectMember, markAsRead);
router.put('/all/read', protectMember, async (req, res) => {
  // Handling the bulk read route explicitly if not handled in controller params
  // Re-using markAsRead with 'all' param logic
  req.params.id = 'all';
  return markAsRead(req, res);
});

module.exports = router;
