const jwt = require('jsonwebtoken');
const Member = require('../models/Member');

const protectMember = async (req, res, next) => {
  let token;

  // Check cookies first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.member = await Member.findById(decoded.id).select('-password');

      if (!req.member) {
        return res.status(401).json({ message: 'Member not found' });
      }

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

module.exports = { protectMember };
