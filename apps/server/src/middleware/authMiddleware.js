const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Set effective owner ID for data filtering
      // If super_admin, they see all (or filtered by query).
      // If staff/admin with branchId, they see branch data.
      req.user.effectiveOwnerId =
        req.user.role === 'staff' ? req.user.ownerId : req.user._id;

      // Populate branchId if available (already on user model, but ensuring it's accessible)
      // req.user.branchId is available directly from the User model

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === 'admin' || req.user.role === 'super_admin')
  ) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

const staffOrAdmin = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === 'admin' ||
      req.user.role === 'super_admin' ||
      req.user.role === 'staff')
  ) {
    next();
  } else {
    res.status(401).json({
      message: 'Not authorized. Only staff or admin accounts allowed.',
    });
  }
};

module.exports = { protect, admin, staffOrAdmin };
