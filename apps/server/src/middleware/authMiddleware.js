const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { isPasswordExpired } = require('../utils/passwordPolicy');

/**
 * Hash a JWT token for session storage (never store raw tokens in DB).
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

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

      // ── Password Expiry Check ──────────────────────────────────────
      // Skip for password-change and logout endpoints
      const isPasswordEndpoint =
        req.path.includes('/change-password') ||
        req.path.includes('/logout') ||
        req.path.includes('/password');
      if (
        !isPasswordEndpoint &&
        req.user.passwordExpiresAt &&
        isPasswordExpired(req.user.passwordExpiresAt)
      ) {
        return res.status(403).json({
          message: 'Your password has expired. Please change your password.',
          code: 'PASSWORD_EXPIRED',
        });
      }

      // ── IP Whitelist Check ─────────────────────────────────────────
      if (
        req.user.ipWhitelistEnabled &&
        req.user.role !== 'super_admin' &&
        req.user.ipWhitelist &&
        req.user.ipWhitelist.length > 0
      ) {
        const clientIP =
          req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
          req.connection?.remoteAddress ||
          req.ip;
        const normalizedIP = clientIP?.replace(/^::ffff:/, '') || '';
        const isAllowed = req.user.ipWhitelist.some(
          (ip) => normalizedIP === ip.replace(/^::ffff:/, '').trim(),
        );
        if (!isAllowed) {
          return res.status(403).json({
            message: 'Access denied. Your IP address is not authorized.',
            code: 'IP_NOT_WHITELISTED',
          });
        }
      }

      // Use centralized permission logic from model
      req.user.permissions = req.user.getPermissions();

      // Branch manager status is stored on the User document (managedBranchId field).
      // This avoids a Branch.findOne() DB query on every single request for staff users.
      if (req.user.role === 'staff') {
        let cachedManagedBranchId = req.user.managedBranchId || null;

        // Self-healing: if managedBranchId was never cached, check the Branch collection once
        // and persist it so future requests are fast.
        if (!cachedManagedBranchId) {
          const Branch = require('../models/Branch');
          const managedBranch = await Branch.findOne({ manager: req.user._id }).select('_id').lean();
          if (managedBranch) {
            cachedManagedBranchId = managedBranch._id;
            // Cache it on the User document so this lookup doesn't repeat
            User.findByIdAndUpdate(req.user._id, {
              managedBranchId: managedBranch._id,
              branchId: req.user.branchId || managedBranch._id,
            }).exec();
          }
        }

        req.user.isManager = !!cachedManagedBranchId;
        req.user.managedBranchId = cachedManagedBranchId;
      } else {
        req.user.isManager = false;
        req.user.managedBranchId = null;
      }

      // Set effective owner ID for data filtering
      req.user.effectiveOwnerId =
        req.user.role === 'staff' ? req.user.ownerId : req.user._id;

      // Activity Pulse: Update lastLoginAt if older than 2 minutes (Vercel Fix)
      const now = new Date();
      if (!req.user.lastLoginAt || now - req.user.lastLoginAt > 2 * 60 * 1000) {
        User.findByIdAndUpdate(req.user._id, { lastLoginAt: now }).exec();
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('[Auth] Token expired for request:', req.originalUrl);
      } else {
        console.error('[Auth] Token verification error:', error.message);
      }
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
    res.status(403).json({ message: 'Not authorized as an admin' });
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
    res.status(403).json({
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
