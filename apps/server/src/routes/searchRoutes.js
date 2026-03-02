const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Member = require('../models/Member');
const Branch = require('../models/Branch');

// Combined middleware for Search
const protectAny = async (req, res, next) => {
  let token;

  // Check Authorization header first (reliable for mobile/Capacitor)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Then check cookies (standard for web)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try User first
      let userDoc = await User.findById(decoded.id)
        .select('-password')
        .populate('roleRef');
      if (userDoc) {
        // Check if account is active
        if (!userDoc.isActive) {
          return res.status(401).json({ message: 'User account deactivated' });
        }

        // Convert to plain object so we can add non-schema properties safely
        const user = userDoc.toObject();
        user.permissions = userDoc.getPermissions();

        // Staff manager logic (replicated from authMiddleware)
        if (user.role === 'staff') {
          const managedBranch = await Branch.findOne({ manager: user._id });
          user.isManager = !!managedBranch;
          user.managedBranchId = managedBranch ? managedBranch._id : null;
        } else {
          user.isManager = false;
          user.managedBranchId = null;
        }
        user.effectiveOwnerId = user.role === 'staff' ? user.ownerId : user._id;
        req.user = user;
        return next();
      }

      // Try Member
      let memberDoc = await Member.findById(decoded.id).select('-password');
      if (memberDoc) {
        if (!memberDoc.isActive) {
          return res
            .status(401)
            .json({ message: 'Member account deactivated' });
        }
        req.member = memberDoc.toObject();
        return next();
      }

      return res
        .status(401)
        .json({ message: 'Not authorized, account not found' });
    } catch (error) {
      console.error('Search Auth Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

router.get('/', protectAny, globalSearch);

module.exports = router;
