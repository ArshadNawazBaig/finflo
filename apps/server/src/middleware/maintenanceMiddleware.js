const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const maintenanceMiddleware = async (req, res, next) => {
  // Always allow health checks and the settings request itself (to avoid deadlock)
  if (req.path === '/api/health' || req.path === '/api/system-settings') {
    return next();
  }

  try {
    const settings = await SystemSettings.getSettings();

    if (settings && settings.maintenanceMode) {
      // Check for superadmin bypass
      // We check if there's a token and if it's a superadmin
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
