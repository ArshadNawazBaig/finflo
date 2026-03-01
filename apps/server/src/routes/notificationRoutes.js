const express = require('express');
const router = express.Router();
const {
  sendNotification,
  getMyNotifications,
  markAsRead,
  getAllNotifications,
  deleteNotification,
  deleteMyNotification,
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

// Super Admin only
router.post('/send', protect, admin, sendNotification);
router.get('/all', protect, admin, getAllNotifications);
router.delete('/:id', protect, admin, deleteNotification);

// Authenticated Users (Business Owners)
router.get('/', protect, getMyNotifications);
router.put('/:id/read', protect, markAsRead);
router.delete('/delete/:id', protect, deleteMyNotification);

module.exports = router;
