const User = require('../models/User');
const Member = require('../models/Member');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const Investment = require('../models/Investment');
const ProfitDistribution = require('../models/ProfitDistribution');
const SavingGoal = require('../models/SavingGoal');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const SupportTicket = require('../models/SupportTicket');
const ActivityLog = require('../models/ActivityLog');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logActivity } = require('./activityLogController');
const sendEmail = require('../utils/sendEmail');
const {
  verificationEmail,
  passwordResetEmail,
} = require('../utils/emailTemplates');
const { deleteCloudinaryFileByUrl } = require('../utils/cloudinaryHelper');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  const lowercaseEmail = email?.toLowerCase();
  const lowercaseName = name?.toLowerCase();

  // Generate 6-digit verification code
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000,
  ).toString();
  const verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  try {
    const userExists = await User.findOne({ email: lowercaseEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if registering as super admin
    const isSuperAdmin =
      lowercaseEmail === process.env.SUPER_ADMIN_EMAIL?.toLowerCase();

    const user = await User.create({
      name: lowercaseName,
      email: lowercaseEmail,
      password,
      role: isSuperAdmin ? 'super_admin' : 'admin',
      isVerified: isSuperAdmin,
      verificationCode: isSuperAdmin ? undefined : verificationCode,
      verificationCodeExpire: isSuperAdmin ? undefined : verificationCodeExpire,
    });

    if (user) {
      // Send verification email (skip for super admin)
      if (!isSuperAdmin) {
        try {
          await sendEmail({
            email: user.email,
            subject: 'Action Required: Verify Your Email',
            message: `Your verification code is: ${verificationCode}`,
            html: verificationEmail(verificationCode),
          });
        } catch (err) {
          console.error('Verification email failed to send:', err);
        }
      }
      // Log activity
      await logActivity({
        userId: user._id,
        action: 'user_registered',
        category: 'auth',
        details: `New user registered: ${user.email}`,
        req,
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        message: 'Registration successful. Please verify your email.',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const lowercaseEmail = email?.toLowerCase();

  try {
    const user = await User.findOne({ email: lowercaseEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Check if email is verified (super_admin and staff are exempt)
    if (
      user.role !== 'super_admin' &&
      user.role !== 'staff' &&
      !user.isVerified
    ) {
      return res.status(403).json({
        message: 'Please verify your email address to log in.',
        notVerified: true,
        email: user.email,
      });
    }

    if (await user.matchPassword(password)) {
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Detect manager status directly (middleware hasn't run yet at login)
      let isManager = false;
      let branchId = user.branchId;
      if (user.role === 'staff') {
        const managedBranch = await Branch.findOne({ manager: user._id });
        isManager = !!managedBranch;
        if (managedBranch) branchId = managedBranch._id;
      }

      // Log activity
      await logActivity({
        userId: user._id,
        action: 'user_login',
        category: 'auth',
        details: `User logged in: ${user.email}`,
        req,
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isManager,
        branchId,
        businessName: user.businessName,
        securityCode: user.securityCode,
        profilePicture: user.profilePicture,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('branchId'); // req.user set by protect middleware
    if (user) {
      // Detect manager status
      let isManager = false;
      let branchId = user.branchId;
      if (user.role === 'staff') {
        const managedBranch = await Branch.findOne({ manager: user._id });
        isManager = !!managedBranch;
        if (managedBranch) branchId = managedBranch._id;
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isManager,
        branchId: branchId?._id || branchId, // Return ID, not populated object
        branch: user.branchId, // Return full branch object for backward compat
        plan: user.plan,
        customerCount: user.customerCount,
        businessName: user.businessName,
        securityCode: user.securityCode,
        profilePicture: user.profilePicture,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDetails = async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name?.toLowerCase(),
    email: req.body.email?.toLowerCase(),
  };

  try {
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'profile_updated',
      category: 'auth',
      details: `User updated their profile details: ${user.email}`,
      req,
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'User details updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile picture from Cloudinary if it exists
    if (user.profilePicture) {
      await deleteCloudinaryFileByUrl(user.profilePicture, 'image');
    }

    user.profilePicture = req.file.path;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'profile_picture_updated',
      category: 'auth',
      details: 'User uploaded a new profile picture',
      req,
    });

    res.json({
      success: true,
      profilePicture: user.profilePicture,
      message: 'Profile picture updated successfully',
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'password_changed',
      category: 'auth',
      details: 'User changed their password',
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const lowercaseEmail = email?.toLowerCase();

  try {
    const user = await User.findOne({ email: lowercaseEmail });

    if (!user) {
      return res.status(404).json({ message: 'No user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    let clientUrl = process.env.CLIENT_URL;

    if (!clientUrl) {
      const origin = req.get('origin') || req.get('referer');
      if (origin) {
        try {
          const url = new URL(origin);
          clientUrl = `${url.protocol}//${url.host}`;
        } catch (e) {
          clientUrl = 'http://localhost:5174';
        }
      } else {
        clientUrl = 'http://localhost:5174';
      }
    }

    const resetUrl = `${clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Action Required: Reset Your Security Credentials',
        message: `Reset your password here: ${resetUrl}`,
        html: passwordResetEmail(resetUrl),
      });

      res.status(200).json({
        success: true,
        data: 'Email sent',
      });

      // Log activity
      await logActivity({
        userId: user._id,
        action: 'forgot_password_requested',
        category: 'auth',
        details: `Password reset link sent to: ${user.email}`,
        req,
      });
    } catch (err) {
      console.error('Email send error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        message: 'Email could not be sent',
        error: err.message, // Providing the specific error message for debugging
      });
    }
  } catch (error) {
    console.error('Forgot Password Error:', error);
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

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'password_reset',
      category: 'auth',
      details: 'User reset their password via token',
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  const lowercaseEmail = email?.toLowerCase();

  try {
    const user = await User.findOne({
      email: lowercaseEmail,
      verificationCode: code,
      verificationCodeExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired verification code' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'email_verified',
      category: 'auth',
      details: `User verified email: ${user.email}`,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resendVerificationCode = async (req, res) => {
  const { email } = req.body;
  const lowercaseEmail = email?.toLowerCase();

  try {
    const user = await User.findOne({ email: lowercaseEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    user.verificationCode = verificationCode;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'Action Required: New Verification Code',
      message: `Your new verification code is: ${verificationCode}`,
      html: verificationEmail(verificationCode),
    });

    res
      .status(200)
      .json({ success: true, message: 'Verification code resent' });

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'verification_code_resent',
      category: 'auth',
      details: `New verification code sent to: ${user.email}`,
      req,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protection for super admin (optional, but safer)
    if (user.role === 'super_admin') {
      return res.status(403).json({
        message: 'Super Admin account cannot be deleted via this endpoint.',
      });
    }

    // Cloudinary Cleanup: Profile Picture
    if (user.profilePicture) {
      try {
        await deleteCloudinaryFileByUrl(user.profilePicture, 'image');
      } catch (err) {
        console.error('Cloudinary deletion failed for profile picture:', err);
      }
    }

    // Cascading Deletion across all models linked to this Admin
    await Repayment.deleteMany({ user: userId }).session(session);
    await Loan.deleteMany({ user: userId }).session(session);
    await Customer.deleteMany({ user: userId }).session(session);
    await Member.deleteMany({ user: userId }).session(session);
    await Investment.deleteMany({ user: userId }).session(session);
    await ProfitDistribution.deleteMany({ user: userId }).session(session);
    await SavingGoal.deleteMany({ user: userId }).session(session);
    await Payment.deleteMany({ user: userId }).session(session);
    await Notification.deleteMany({
      $or: [
        { recipient: userId, recipientModel: 'User' },
        {
          recipient: {
            $in: await Member.find({ user: userId }).distinct('_id'),
          },
          recipientModel: 'Member',
        },
      ],
    }).session(session);
    await SupportTicket.deleteMany({ user: userId }).session(session);
    await ActivityLog.deleteMany({ user: userId }).session(session);
    await Branch.deleteMany({ owner: userId }).session(session);

    // Finally delete the user
    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();
    session.endSession();

    // Log activity
    await logActivity({
      userId: userId,
      action: 'account_deleted',
      category: 'auth',
      details: `User permanently deleted their account: ${user.email}`,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Account and all associated business data permanently deleted.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Delete Account Error:', error);
    res
      .status(500)
      .json({ message: 'Failed to delete account. Please try again later.' });
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profilePicture) {
      await deleteCloudinaryFileByUrl(user.profilePicture, 'image');
      user.profilePicture = undefined;
      await user.save();

      // Log activity
      await logActivity({
        userId: user._id,
        action: 'profile_picture_deleted',
        category: 'auth',
        details: 'User deleted their profile picture',
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
    console.error('Delete Profile Picture Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateDetails,
  uploadProfilePicture,
  deleteProfilePicture,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationCode,
  deleteAccount,
};
