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
  deleteConversation,
  deleteAllConversations,
  setStatus,
  getStatus,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');

// Middleware that accepts EITHER a staff/admin token OR a member token
const protectAny = async (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  const Member = require('../models/Member');
  const Branch = require('../models/Branch');

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
    const member = await Member.findById(decoded.id).select('-password');
    if (member) {
      req.member = member;
      return next();
    }

    // Check if it's a user token (Staff/Admin/Super Admin)
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('roleRef');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Set properties manually since we're not using the central protect middleware
    if (user.role === 'staff') {
      const managedBranch = await Branch.findOne({ manager: user._id });
      user.isManager = !!managedBranch;
      user.managedBranchId = managedBranch ? managedBranch._id : null;
      user.effectiveOwnerId = user.ownerId;
    } else {
      user.isManager = false;
      user.managedBranchId = null;
      user.effectiveOwnerId = user._id; // Admin/Super Admin is the owner
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Chat Security] Error:', error.message);
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
router.delete('/conversations/all', protectAny, deleteAllConversations);
router.delete('/conversations/:id', protectAny, deleteConversation);
router.post('/conversations/:id/read', protectAny, markAsRead);
router.post('/conversations/:id/status', protectAny, setStatus);
router.get('/conversations/:id/status', protectAny, getStatus);

module.exports = router;
