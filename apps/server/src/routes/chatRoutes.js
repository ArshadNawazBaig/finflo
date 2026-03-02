const express = require('express');
const router = express.Router();
const {
  chatUpload,
  getAvailableContacts,
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');

// Middleware that accepts EITHER a staff/admin token OR a member token
const protectAny = (req, res, next) => {
  // Try member auth first
  const jwt = require('jsonwebtoken');
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token)
    return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check if it's a member token
    const Member = require('../models/Member');
    const User = require('../models/User');

    Member.findById(decoded.id)
      .select('-password')
      .then((member) => {
        if (member) {
          req.member = member;
          next();
        } else {
          return User.findById(decoded.id)
            .select('-password')
            .populate('roleRef')
            .then((user) => {
              if (user) {
                req.user = user;
                next();
              } else {
                res.status(401).json({ message: 'User not found' });
              }
            });
        }
      })
      .catch(() => res.status(401).json({ message: 'Not authorized' }));
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// All routes use dual-auth middleware
router.get('/contacts', protectAny, getAvailableContacts);
router.get('/conversations', protectAny, getConversations);
router.post('/conversations', protectAny, getOrCreateConversation);
router.get('/conversations/:id/messages', protectAny, getMessages);
router.post(
  '/conversations/:id/messages',
  protectAny,
  chatUpload.single('media'),
  sendMessage,
);
router.put('/messages/:id', protectAny, editMessage);
router.delete('/messages/:id', protectAny, deleteMessage);
router.post('/conversations/:id/read', protectAny, markAsRead);

module.exports = router;
