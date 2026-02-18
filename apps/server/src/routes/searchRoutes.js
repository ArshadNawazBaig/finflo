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

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try User first
      let user = await User.findById(decoded.id).select('-password');
      if (user) {
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
      let member = await Member.findById(decoded.id).select('-password');
      if (member) {
        req.member = member;
        return next();
      }

      return res
        .status(401)
        .json({ message: 'Not authorized, account not found' });
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

router.get('/', protectAny, globalSearch);

module.exports = router;
