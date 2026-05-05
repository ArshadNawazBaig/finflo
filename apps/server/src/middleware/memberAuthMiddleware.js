const jwt = require('jsonwebtoken');
const Member = require('../models/Member');

const protectMember = async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Fallback to cookies
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.member = await Member.findById(decoded.id).select('-password');

      if (!req.member) {
        return res.status(401).json({ message: 'Member not found' });
      }

      // Activity Pulse: Update lastLoginAt if older than 2 minutes (Vercel Fix)
      const now = new Date();
      if (
        !req.member.lastLoginAt ||
        now - req.member.lastLoginAt > 2 * 60 * 1000
      ) {
        Member.findByIdAndUpdate(req.member._id, { lastLoginAt: now }).exec();
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('[MemberAuth] Token expired for request:', req.originalUrl);
      } else {
        console.error('[MemberAuth] Token verification error:', error.message);
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // No Authorization header present at all
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protectMember };
