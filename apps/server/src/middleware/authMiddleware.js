const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Branch = require('../models/Branch');

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header first (reliable for mobile/Capacitor)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Fallback to cookies for web/legacy
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id)
        .select('-password')
        .populate('roleRef');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Use centralized permission logic from model
      req.user.permissions = req.user.getPermissions();

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
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // No Authorization header present at all
    return res.status(401).json({ message: 'Not authorized, no token' });
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

const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Super admin has all permissions
    if (req.user.permissions.includes('*') || req.user.role === 'super_admin') {
      return next();
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user.permissions.includes(perm),
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: 'Permission denied. You do not have the required access.',
      });
    }

    next();
  };
};

module.exports = {
  protect,
  admin,
  staffOrAdmin,
  authorizePermissions,
};
