const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// In-memory cache to avoid querying DB on every single request
let cachedMaintenanceMode = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Refresh the cached maintenance state from DB.
 * Called automatically when cache expires, or externally when settings change.
 */
const refreshMaintenanceCache = async () => {
  try {
    const settings = await SystemSettings.getSettings();
    cachedMaintenanceMode = settings?.maintenanceMode || false;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  } catch (err) {
    console.error('[Maintenance] Cache refresh error:', err.message);
    // On error, default to non-maintenance to avoid locking out users
    cachedMaintenanceMode = false;
  }
};

const maintenanceMiddleware = async (req, res, next) => {
  // Always allow health checks and the settings request itself (to avoid deadlock)
  if (req.path === '/api/health' || req.path === '/api/system-settings') {
    return next();
  }

  try {
    // Refresh cache if expired
    if (Date.now() > cacheExpiresAt) {
      await refreshMaintenanceCache();
    }

    if (cachedMaintenanceMode) {
      // Check for superadmin bypass
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);

          if (decoded && decoded.id) {
            const user = await User.findById(decoded.id).select('role');
            if (user && user.role === 'super_admin') {
              return next();
            }
          }
        } catch (err) {
          // Token invalid or expired, proceed to block
        }
      }

      // If we reach here, maintenance is active and user is not verified superadmin
      return res.status(503).json({
        message:
          'System is currently under maintenance. Please try again later.',
        maintenanceMode: true,
      });
    }

    next();
  } catch (error) {
    console.error('Maintenance middleware error:', error);
    next();
  }
};

module.exports = maintenanceMiddleware;
module.exports.refreshMaintenanceCache = refreshMaintenanceCache;
