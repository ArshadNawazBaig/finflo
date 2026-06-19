/**
 * IP Whitelist Middleware
 * ──────────────────────
 * Restricts access to whitelisted IP addresses per-business.
 * Banks require the ability to lock down admin access to specific office IPs.
 */
const { logIPBlocked } = require('../utils/securityLogger');

const ipWhitelistMiddleware = async (req, res, next) => {
  // Only apply after authentication (req.user must exist)
  if (!req.user) return next();

  // Skip if IP whitelisting is not enabled for this user's business
  if (!req.user.ipWhitelistEnabled) return next();

  // Super admins bypass IP whitelist
  if (req.user.role === 'super_admin') return next();

  const whitelist = req.user.ipWhitelist || [];
  if (whitelist.length === 0) return next(); // No whitelist configured

  // Get client IP (supports proxies)
  const clientIP =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip;

  // Normalize IPv6-mapped IPv4 addresses
  const normalizedIP = clientIP?.replace(/^::ffff:/, '') || '';

  // Check if IP is in the whitelist
  const isAllowed = whitelist.some((allowedIP) => {
    const normalizedAllowed = allowedIP.replace(/^::ffff:/, '').trim();

    // Exact match
    if (normalizedIP === normalizedAllowed) return true;

    // CIDR range match (e.g., 192.168.1.0/24)
    if (normalizedAllowed.includes('/')) {
      return isIPInCIDR(normalizedIP, normalizedAllowed);
    }

    // Wildcard match (e.g., 192.168.1.*)
    if (normalizedAllowed.includes('*')) {
      const regex = new RegExp(
        '^' + normalizedAllowed.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$',
      );
      return regex.test(normalizedIP);
    }

    return false;
  });

  if (!isAllowed) {
    // Log the blocked attempt
    logIPBlocked({
      userId: req.user._id,
      ip: normalizedIP,
      userAgent: req.headers['user-agent'],
      details: `Access denied — IP ${normalizedIP} not in whitelist`,
      metadata: {
        whitelist,
        attemptedPath: req.path,
        method: req.method,
      },
    });

    return res.status(403).json({
      message: 'Access denied. Your IP address is not authorized.',
      code: 'IP_NOT_WHITELISTED',
    });
  }

  next();
};

/**
 * Check if an IP address falls within a CIDR range.
 * @param {string} ip - IP address to check
 * @param {string} cidr - CIDR range (e.g., "192.168.1.0/24")
 * @returns {boolean}
 */
const isIPInCIDR = (ip, cidr) => {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

    const ipNum =
      (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeNum =
      (rangeParts[0] << 24) |
      (rangeParts[1] << 16) |
      (rangeParts[2] << 8) |
      rangeParts[3];
    const mask = bits === 0 ? 0 : -1 << (32 - bits);

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
};

module.exports = ipWhitelistMiddleware;
