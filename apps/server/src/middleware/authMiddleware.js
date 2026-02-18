const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Branch = require('../models/Branch');

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

      // Check if this staff member is a branch manager
      if (req.user.role === 'staff') {
        const managedBranch = await Branch.findOne({ manager: req.user._id });
        req.user.isManager = !!managedBranch;
        req.user.managedBranchId = managedBranch ? managedBranch._id : null;
      } else {
        req.user.isManager = false;
        req.user.managedBranchId = null;
      }

      // Set effective owner ID for data filtering
      // If super_admin, they see all (or filtered by query).
      // If staff/admin with branchId, they see branch data.
      req.user.effectiveOwnerId =
        req.user.role === 'staff' ? req.user.ownerId : req.user._id;

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
    (req.user.role === 'admin' ||
      req.user.role === 'super_admin' ||
      req.user.isManager)
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
