const Member = require('../models/Member');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activityLogController');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
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
      // If 2FA is enabled, return a pending status and temporary token
      if (member.isTwoFactorEnabled) {
        const pendingToken = jwt.sign(
          { id: member._id, pending2FA: true },
          process.env.JWT_SECRET,
          { expiresIn: '5m' },
        );
        return res.json({
          twoFactorRequired: true,
          pendingToken,
          email: member.email,
        });
      }

      // Update lastLoginAt without triggering full validation hooks
      await Member.findByIdAndUpdate(member._id, { lastLoginAt: new Date() });

      const token = generateToken(member._id);

      if (member.mustChangePassword) {
        return res.cookie('token', token, cookieOptions).json({
          mustChangePassword: true,
          _id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
          business: member.user,
        });
      }

      // Log activity
      await logActivity({
        userId: member._id,
        action: 'member_login',
        category: 'auth',
        details: `Member logged in: ${member.email}`,
        req,
      });

      res.cookie('token', token, cookieOptions).json({
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        mustChangePassword: false,
        business: member.user, // The business this member belongs to
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
  if (req.body.email) {
    const { validateEmail } = require('../utils/emailValidator');
    const emailValidation = validateEmail(req.body.email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.message });
    }
  }
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

    // Log activity
    await logActivity({
      userId: member._id,
      action: 'member_profile_updated',
      category: 'auth',
      details: `Member updated their profile: ${member.email}`,
      req,
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

    // Log activity
    await logActivity({
      userId: member._id,
      action: 'member_profile_picture_updated',
      category: 'auth',
      details: 'Member updated their profile picture',
      req,
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

    // Log activity
    await logActivity({
      userId: member._id,
      action: 'member_password_changed',
      category: 'auth',
      details: 'Member changed their password',
      req,
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

    // Log activity
    await logActivity({
      userId: memberId,
      action: 'member_account_deleted',
      category: 'auth',
      details: `Member permanently deleted their account: ${member.email}`,
      req,
    });

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

      // Log activity
      await logActivity({
        userId: member._id,
        action: 'member_forgot_password_requested',
        category: 'auth',
        details: `Member password reset link sent to: ${member.email}`,
        req,
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

    // Log activity
    await logActivity({
      userId: member._id,
      action: 'member_password_reset',
      category: 'auth',
      details: 'Member reset their password via token',
      req,
    });
  } catch (error) {
    console.error('Member Reset Password Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (member.profilePicture) {
      const {
        deleteCloudinaryFileByUrl,
      } = require('../utils/cloudinaryHelper');
      await deleteCloudinaryFileByUrl(member.profilePicture, 'image');

      member.profilePicture = undefined;
      await member.save();

      // Sync with Customer if linked
      if (member.customer) {
        const Customer = require('../models/Customer');
        await Customer.findByIdAndUpdate(member.customer, {
          profilePicture: undefined,
        });
      }

      // Log activity
      await logActivity({
        userId: member._id,
        action: 'member_profile_picture_deleted',
        category: 'auth',
        details: 'Member deleted their profile picture',
        req,
      });

      res.json({
        success: true,
        message: 'Profile picture deleted successfully',
      });
    } else {
      res.status(400).json({ message: 'No profile picture to delete' });
    }
  } catch (error) {
    console.error('Delete Member Profile Picture Error:', error);
    res.status(500).json({ message: error.message });
  }
};

/** Generate a TOTP secret & return a QR code for the member */
const generate2FA = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.isTwoFactorEnabled)
      return res.status(400).json({ message: '2FA is already enabled' });

    const secret = authenticator.generateSecret();
    // Temporarily store secret until the user verifies
    member.twoFactorSecret = secret;
    await member.save({ validateBeforeSave: false });

    const appName = 'FinanceFlow';
    const otpauthUrl = authenticator.keyuri(member.email, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({ qrCode: qrCodeDataUrl, secret });
  } catch (error) {
    console.error('2FA Generate Error:', error);
    res.status(500).json({ message: error.message });
  }
};

/** Verify and Enable 2FA for the member */
const verify2FA = async (req, res) => {
  const { code } = req.body;
  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (!member.twoFactorSecret)
      return res
        .status(400)
        .json({ message: 'No 2FA secret found. Generate one first.' });

    const isValid = await authenticator.verify({
      token: code,
      secret: member.twoFactorSecret,
    });
    if (!isValid)
      return res.status(400).json({ message: 'Invalid or expired code' });

    member.isTwoFactorEnabled = true;
    await member.save({ validateBeforeSave: false });

    await logActivity({
      userId: member._id,
      action: 'member_2fa_enabled',
      category: 'auth',
      details: 'Member enabled Two-Factor Authentication',
      req,
    });

    res.json({
      success: true,
      message: 'Two-Factor Authentication enabled successfully.',
    });
  } catch (error) {
    console.error('2FA Verify Error:', error);
    res.status(500).json({ message: error.message });
  }
};

/** Disable 2FA for the member */
const disable2FA = async (req, res) => {
  const { password } = req.body;
  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (!(await member.matchPassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    member.isTwoFactorEnabled = false;
    member.twoFactorSecret = undefined;
    await member.save({ validateBeforeSave: false });

    await logActivity({
      userId: member._id,
      action: 'member_2fa_disabled',
      category: 'auth',
      details: 'Member disabled Two-Factor Authentication',
      req,
    });

    res.json({
      success: true,
      message: 'Two-Factor Authentication disabled successfully.',
    });
  } catch (error) {
    console.error('2FA Disable Error:', error);
    res.status(500).json({ message: error.message });
  }
};

/** Second step of the 2FA login flow for members */
const verifyLogin2FA = async (req, res) => {
  const { pendingToken, code } = req.body;
  try {
    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch (e) {
      return res
        .status(401)
        .json({ message: 'Invalid or expired session. Please log in again.' });
    }

    if (!decoded.pending2FA)
      return res.status(400).json({ message: 'Invalid 2FA token' });

    const member = await Member.findById(decoded.id).populate(
      'user',
      'name businessName securityCode',
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const isValid = await authenticator.verify({
      token: code,
      secret: member.twoFactorSecret,
    });
    if (!isValid)
      return res.status(400).json({ message: 'Invalid or expired 2FA code' });

    // Update last login
    member.lastLoginAt = new Date();
    await member.save({ validateBeforeSave: false });

    await logActivity({
      userId: member._id,
      action: 'member_login',
      category: 'auth',
      details: `Member logged in with 2FA: ${member.email}`,
      req,
    });

    res.cookie('token', generateToken(member._id), cookieOptions).json({
      _id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      business: member.user,
      isTwoFactorEnabled: member.isTwoFactorEnabled,
    });
  } catch (error) {
    console.error('Verify Login 2FA Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const requestMemberPasswordChangeCode = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    member.passwordChangeCode = code;
    member.passwordChangeCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await member.save({ validateBeforeSave: false });

    // Send Email
    try {
      const { verificationEmail } = require('../utils/emailTemplates');
      const { sendEmail } = require('../utils/email');
      const emailSent = await sendEmail({
        to: member.email,
        subject: 'Security Code for Password Change',
        html: verificationEmail(code),
      });

      if (!emailSent) {
        return res.status(500).json({
          message:
            'Failed to send security code email. Please check SMTP settings.',
        });
      }

      res.json({ success: true, message: 'Security code sent to email' });
    } catch (emailErr) {
      console.error('Failed to send password change code email:', emailErr);
      res.status(500).json({ message: 'Failed to send email' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forceMemberChangePassword = async (req, res) => {
  const { code, newPassword } = req.body;

  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (
      !member.passwordChangeCode ||
      member.passwordChangeCode !== code ||
      member.passwordChangeCodeExpire < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired security code' });
    }

    member.password = newPassword;
    member.mustChangePassword = false;
    member.passwordChangeCode = undefined;
    member.passwordChangeCodeExpire = undefined;
    await member.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logoutMember = (req, res) => {
  res
    .cookie('token', '', { ...cookieOptions, maxAge: 0 })
    .json({ message: 'Logged out successfully' });
};

module.exports = {
  logoutMember,
  loginMember,
  getMe,
  updateDetails,
  uploadProfilePicture,
  deleteProfilePicture,
  updatePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
  generate2FA,
  verify2FA,
  disable2FA,
  verifyLogin2FA,
  requestPasswordChangeCode: requestMemberPasswordChangeCode,
  forceChangePassword: forceMemberChangePassword,
};
