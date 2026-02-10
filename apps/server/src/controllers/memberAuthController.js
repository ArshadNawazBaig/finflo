const Member = require('../models/Member');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Auth member & get token
// @route   POST /api/auth/member/login
// @access  Public
const loginMember = async (req, res) => {
  const { email, password, securityCode } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !securityCode) {
      return res.status(400).json({
        message: 'Please provide email, password, and business security code',
      });
    }

    // Find the business by security code
    const User = require('../models/User');
    const business = await User.findOne({
      securityCode: securityCode.toUpperCase(),
    });

    if (!business) {
      return res.status(401).json({
        message: 'Invalid business security code',
      });
    }

    // Find member by email and verify they belong to this business
    const member = await Member.findOne({
      email,
      user: business._id,
    }).populate('user', 'name businessName securityCode');

    if (!member) {
      return res.status(401).json({
        message: 'Invalid credentials or you do not belong to this business',
      });
    }

    if (!member.isActive) {
      return res
        .status(403)
        .json({ message: 'Account is inactive. Contact admin.' });
    }

    if (await member.matchPassword(password)) {
      member.lastLoginAt = new Date();
      await member.save();

      res.json({
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        business: member.user, // The business this member belongs to
        token: generateToken(member._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current member profile
// @route   GET /api/auth/member/me
// @access  Private (Member)
const getMe = async (req, res) => {
  try {
    // req.member set by protectMember middleware
    const member = await Member.findById(req.member._id).populate(
      'user',
      'name businessName',
    );

    if (member) {
      res.json(member);
    } else {
      res.status(404);
      throw new Error('Member not found');
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginMember,
  getMe,
};
