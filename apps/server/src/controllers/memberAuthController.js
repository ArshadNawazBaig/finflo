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
      email: email.toLowerCase().trim(),
      user: business._id,
    }).populate('user', 'name businessName securityCode');

    if (!member) {
      return res.status(401).json({
        message:
          'Invalid credentials or information does not match our records',
      });
    }

    if (!member.isActive) {
      return res
        .status(403)
        .json({ message: 'Account is inactive. Contact admin.' });
    }

    if (await member.matchPassword(password)) {
      // Update lastLoginAt without triggering full validation hooks
      await Member.findByIdAndUpdate(member._id, { lastLoginAt: new Date() });

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

// @desc    Update member details
// @route   PUT /api/member-auth/updatedetails
// @access  Private (Member)
const updateDetails = async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email?.toLowerCase(),
  };

  try {
    const member = await Member.findByIdAndUpdate(
      req.member._id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Sync with Customer if linked
    if (member.customer) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(member.customer, fieldsToUpdate);
    }

    res.status(200).json({
      success: true,
      data: member,
      message: 'Member details updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload member profile picture
// @route   PUT /api/member-auth/updateprofilepicture
// @access  Private (Member)
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const member = await Member.findById(req.member._id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Delete old profile picture from Cloudinary if it exists
    if (member.profilePicture) {
      const {
        deleteCloudinaryFileByUrl,
      } = require('../utils/cloudinaryHelper');
      await deleteCloudinaryFileByUrl(member.profilePicture, 'image');
    }

    member.profilePicture = req.file.path;
    await member.save();

    // Sync with Customer if linked
    if (member.customer) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(member.customer, {
        profilePicture: req.file.path,
      });
    }

    res.json({
      success: true,
      profilePicture: member.profilePicture,
      message: 'Profile picture updated successfully',
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update member password
// @route   PUT /api/member-auth/updatepassword
// @access  Private (Member)
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const member = await Member.findById(req.member._id).select('+password');

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (!(await member.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    member.password = newPassword;
    await member.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete member account
// @route   DELETE /api/member-auth/deleteaccount
// @access  Private (Member)
const deleteAccount = async (req, res) => {
  try {
    const memberId = req.member._id;
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Delete all related data
    const SavingGoal = require('../models/SavingGoal');
    const ActivityLog = require('../models/ActivityLog');
    const Notification = require('../models/Notification');

    // Delete member's saving goals
    await SavingGoal.deleteMany({ member: memberId });

    // Delete member's activity logs
    await ActivityLog.deleteMany({ user: memberId });

    // Delete member's notifications
    await Notification.deleteMany({
      recipient: memberId,
      recipientModel: 'Member',
    });

    // Finally delete the member
    await Member.findByIdAndDelete(memberId);

    res.status(200).json({
      success: true,
      message: 'Account and all associated data permanently deleted.',
    });
  } catch (error) {
    console.error('Delete Member Account Error:', error);
    res
      .status(500)
      .json({ message: 'Failed to delete account. Please try again later.' });
  }
};

const forgotPassword = async (req, res) => {
  const { email, securityCode } = req.body;

  try {
    // 1. Find business by security code
    const User = require('../models/User');
    const business = await User.findOne({
      securityCode: securityCode?.toUpperCase(),
    });

    if (!business) {
      return res
        .status(404)
        .json({ message: 'Invalid business security code' });
    }

    // 2. Find member in this business
    const member = await Member.findOne({
      email: email?.toLowerCase().trim(),
      user: business._id,
    });

    if (!member) {
      return res
        .status(404)
        .json({ message: 'No member found with that email in this business' });
    }

    // 3. Get reset token
    const resetToken = member.getResetPasswordToken();
    await member.save({ validateBeforeSave: false });

    // 4. Create reset url
    let clientUrl = process.env.CLIENT_URL;
    if (!clientUrl) {
      const origin = req.get('origin') || req.get('referer');
      if (origin) {
        try {
          const url = new URL(origin);
          clientUrl = `${url.protocol}//${url.host}`;
        } catch (e) {
          clientUrl = 'http://localhost:5173';
        }
      } else {
        clientUrl = 'http://localhost:5173';
      }
    }

    const resetUrl = `${clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl}/member/reset-password/${resetToken}`;

    const sendEmail = require('../utils/sendEmail');
    const { passwordResetEmail } = require('../utils/emailTemplates');

    try {
      await sendEmail({
        email: member.email,
        subject: 'Reset Your Member Portal Password',
        message: `Reset your password here: ${resetUrl}`,
        html: passwordResetEmail(resetUrl),
      });

      res.status(200).json({
        success: true,
        data: 'Email sent',
      });
    } catch (err) {
      console.error('Email send error:', err);
      member.resetPasswordToken = undefined;
      member.resetPasswordExpire = undefined;
      await member.save({ validateBeforeSave: false });

      return res.status(500).json({
        message: 'Email could not be sent',
        error: err.message,
      });
    }
  } catch (error) {
    console.error('Member Forgot Password Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = require('crypto')
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const member = await Member.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!member) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password
    member.password = req.body.password;
    member.resetPasswordToken = undefined;
    member.resetPasswordExpire = undefined;
    await member.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Member Reset Password Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  loginMember,
  getMe,
  updateDetails,
  uploadProfilePicture,
  updatePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
};
