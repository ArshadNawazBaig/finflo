const jwt = require('jsonwebtoken');
const { protect } = require('./authMiddleware');
const { protectMember } = require('./memberAuthMiddleware');
const Session = require('../models/Session');

// Shared endpoints still apply each portal's existing authorization checks.
const protectPrincipal = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    const decoded = jwt.verify(token || '', process.env.JWT_SECRET);
    if (decoded.type && !['user', 'member'].includes(decoded.type)) {
      return res.status(401).json({ message: 'Not authorized, wrong token type' });
    }
    if (decoded.sid) {
      const active = await Session.exists({
        _id: decoded.sid, principal: decoded.id,
        principalModel: decoded.type === 'member' ? 'Member' : 'User',
        revokedAt: null, expiresAt: { $gt: new Date() },
      });
      if (!active) return res.status(401).json({ message: 'Session expired or revoked' });
    }
    return (decoded.type === 'member' ? protectMember : protect)(req, res, next);
  } catch {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

module.exports = { protectPrincipal };
