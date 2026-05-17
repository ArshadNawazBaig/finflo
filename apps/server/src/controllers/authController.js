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
const crypto = require('crypto');

// Cryptographically random 6-digit verification code. Math.random is not
// suitable for security-bearing OTPs (predictable PRNG state).
const generate6DigitCode = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
const { logActivity } = require('./activityLogController');
const { sendEmail } = require('../utils/email');
const {
  verificationEmail,
  passwordResetEmail,
  welcomeBusinessEmail,
  superAdminNewRegistrationEmail,
} = require('../utils/emailTemplates');
const { deleteCloudinaryFileByUrl, mirrorRemoteImage } = require('../utils/cloudinaryHelper');
const { validatePassword } = require('../utils/validation');
const { getFriendlyErrorMessage } = require('../utils/errorHandler');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Accept tokens from both Web and Android native OAuth clients
const googleAllowedAudiences = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
].filter(Boolean);

const generateToken = (id) => {
  // type: 'user' prevents a Member-collection token from being accepted by
  // the User middleware (and vice versa) — protects against cross-collection
  // ObjectId collisions/token confusion.
  return jwt.sign({ id, type: 'user' }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // SameSite=None required for cross-origin (Vercel frontend → Railway backend)
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  const { validateEmail } = require('../utils/emailValidator');
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return res.status(400).json({ message: emailValidation.message });
  }
  const lowercaseEmail = email?.toLowerCase();
  const lowercaseName = name?.toLowerCase();

  // Generate 6-digit verification code (CSPRNG)
  const verificationCode = generate6DigitCode();
  const verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  try {
    const userExists = await User.findOne({ email: lowercaseEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // SECURITY: do NOT auto-promote based on a matching email env var.
    // Super admins must be provisioned explicitly (script/DB), not via
    // self-registration. Every public registration is a plain admin who must
    // verify their email like everyone else.
    const user = await User.create({
      name: lowercaseName,
      email: lowercaseEmail,
      password,
      role: 'admin',
      isVerified: false,
      verificationCode,
      verificationCodeExpire,
    });

    if (user) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Action Required: Verify Your Email',
          html: verificationEmail(
            verificationCode,
            user.businessName || user.name,
            user.businessLogo,
          ),
        });
      } catch (err) {
        console.error('Verification email failed to send:', err);
      }
      // Notify Super Admin of new business registration
      {
        try {
          const superAdmin = await User.findOne({ role: 'super_admin' });
          if (superAdmin) {
            // Email Notification
            await sendEmail({
              to: superAdmin.email,
              subject: `New Business Registration: ${user.name}`,
              html: superAdminNewRegistrationEmail({
                name: user.name,
                email: user.email,
              }),
            });

            // In-App Notification
            await Notification.create({
              recipient: superAdmin._id,
              recipientModel: 'User',
              title: 'New Business Registration',
              message: `${user.name} (${user.email}) has registered on the platform.`,
              type: 'info',
              link: '/super-admin/users', // Assuming this is where super admin manages users
            });
          }
        } catch (err) {
          console.error('Super Admin notification failed:', err);
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
    res.status(500).json({ message: getFriendlyErrorMessage(error) });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const lowercaseEmail = email?.toLowerCase();

  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

  try {
    const user = await User.findOne({ email: lowercaseEmail }).populate(
      'roleRef',
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        locked: true,
      });
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

    if (user.isGoogleAuth && !user.password) {
      return res.status(401).json({
        message:
          'This account is registered via Google. Please use the Google Login option.',
      });
    }

    if (await user.matchPassword(password)) {
      // Reset failed attempts on successful login
      if (user.failedLoginAttempts > 0 || user.lockUntil) {
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
      }

      // If 2FA is enabled, return a pending token and prompt for OTP
      if (user.isTwoFactorEnabled) {
        await user.save();
        const pendingToken = jwt.sign(
          { id: user._id, pending2FA: true },
          process.env.JWT_SECRET,
          { expiresIn: '5m' },
        );
        return res.json({ requires2FA: true, pendingToken });
      }

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

        if (user.ownerId) {
          const owner = await User.findById(user.ownerId).select(
            'plan businessName businessLogo businessAddress businessAbbreviation',
          );
          if (owner) {
            user.plan = owner.plan;
            // Always use the owner's branding for staff/managers
            if (owner.businessName) user.businessName = owner.businessName;
            if (owner.businessLogo) user.businessLogo = owner.businessLogo;
            if (owner.businessAbbreviation)
              user.businessAbbreviation = owner.businessAbbreviation;
          }
        }
      }

      // Log activity
      await logActivity({
        userId: user._id,
        action: 'user_login',
        category: 'auth',
        details: `User logged in: ${user.email}`,
        req,
      });

      const token = generateToken(user._id);

      if (user.mustChangePassword) {
        return res.cookie('token', token, cookieOptions).json({
          token,
          mustChangePassword: true,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isManager,
          branchId,
          businessName: user.businessName,
          businessLogo: user.businessLogo,
          businessAddress: user.businessAddress,
          profilePicture: user.profilePicture,
          plan: user.plan,
          subscriptionStatus: user.subscriptionStatus,
          permissions: user.getPermissions(),
        });
      }

      res.cookie('token', token, cookieOptions).json({
        token,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isManager,
        branchId,
        businessName: user.businessName,
        businessLogo: user.businessLogo,
        businessAddress: user.businessAddress,
        securityCode: user.securityCode,
        businessAbbreviation: user.businessAbbreviation,
        profilePicture: user.profilePicture,
        currency: user.currency,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        permissions: user.getPermissions(),
      });
    } else {
      // Increment failed attempts and lock if threshold reached
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        await user.save();
        return res.status(423).json({
          message: 'Too many failed attempts. Account locked for 15 minutes.',
          locked: true,
        });
      }
      await user.save();
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: getFriendlyErrorMessage(error) });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('branchId')
      .populate('roleRef'); // req.user set by protect middleware
    if (user) {
      // Detect manager status
      let isManager = false;
      let branchId = user.branchId;
      if (user.role === 'staff') {
        const managedBranch = await Branch.findOne({ manager: user._id });
        isManager = !!managedBranch;
        if (managedBranch) branchId = managedBranch._id;

        if (user.ownerId) {
          const owner = await User.findById(user.ownerId).select(
            'plan businessName businessLogo businessAddress businessAbbreviation businessStamp ceoSignature',
          );
          if (owner) {
            user.plan = owner.plan;
            // Always use the owner's branding for staff/managers
            if (owner.businessName) user.businessName = owner.businessName;
            if (owner.businessLogo) user.businessLogo = owner.businessLogo;
            if (owner.businessStamp) user.businessStamp = owner.businessStamp;
            if (owner.ceoSignature) user.ceoSignature = owner.ceoSignature;
            if (owner.businessAbbreviation)
              user.businessAbbreviation = owner.businessAbbreviation;
          }
        }
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
        subscriptionStatus: user.subscriptionStatus,
        customerCount: user.customerCount,
        businessName: user.businessName,
        businessLogo: user.businessLogo,
        businessAddress: user.businessAddress,
        businessStamp: user.businessStamp,
        ceoSignature: user.ceoSignature,
        securityCode: user.securityCode,
        businessAbbreviation: user.businessAbbreviation,
        profilePicture: user.profilePicture,
        currency: user.currency,
        savingProfitRate: user.savingProfitRate || 0,
        permissions: user.getPermissions(),
        pendingMembersCount:
          user.role === 'admin' || user.role === 'staff'
            ? await Member.countDocuments({
                user: user.role === 'staff' ? user.ownerId : user._id,
                approvalStatus: 'pending',
              })
            : 0,
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
  if (req.body.email) {
    const { validateEmail } = require('../utils/emailValidator');
    const emailValidation = validateEmail(req.body.email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.message });
    }
  }
  const fieldsToUpdate = {
    name: req.body.name?.toLowerCase(),
    email: req.body.email?.toLowerCase(),
    businessName: req.body.businessName,
    businessAddress: req.body.businessAddress,
    businessStamp: req.body.businessStamp,
    ceoSignature: req.body.ceoSignature,
    currency: req.body.currency,
    businessAbbreviation: req.body.businessAbbreviation?.toUpperCase(),
  };

  // primaryColor is a Tailwind HSL triplet ("H S% L%"). Validate loosely so
  // we don't accept arbitrary strings that would break CSS variables.
  if (typeof req.body.primaryColor === 'string') {
    const trimmed = req.body.primaryColor.trim();
    if (trimmed === '' || /^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(trimmed)) {
      fieldsToUpdate.primaryColor = trimmed;
    }
  }

  // Allow admins to update savingProfitRate
  if (req.body.savingProfitRate !== undefined) {
    const rate = parseFloat(req.body.savingProfitRate);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
      fieldsToUpdate.savingProfitRate = rate;
    }
  }

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

    // Emit branding update event if business name changed
    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        io.to(`business_${user._id.toString()}`).emit(
          'business:branding_updated',
          {
            businessName: user.businessName,
            businessLogo: user.businessLogo,
            businessStamp: user.businessStamp,
            ceoSignature: user.ceoSignature,
            primaryColor: user.primaryColor,
          },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit branding update:',
        socketErr.message,
      );
    }
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

const uploadBusinessLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Plan check for Business Branding
    if (user.role !== 'super_admin' && user.plan === 'Free') {
      return res.status(403).json({
        message:
          'Business Branding is only available on Basic or Pro plans. Please upgrade to continue.',
      });
    }

    // Delete old business logo from Cloudinary if it exists
    if (user.businessLogo) {
      const {
        deleteCloudinaryFileByUrl,
      } = require('../utils/cloudinaryHelper');
      await deleteCloudinaryFileByUrl(user.businessLogo, 'image');
    }

    user.businessLogo = req.file.path;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'business_logo_updated',
      category: 'auth',
      details: 'User uploaded a new business logo',
      req,
    });

    res.json({
      success: true,
      businessLogo: user.businessLogo,
      message: 'Business logo updated successfully',
    });

    // Emit branding update event
    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        io.to(`business_${user._id.toString()}`).emit(
          'business:branding_updated',
          {
            businessName: user.businessName,
            businessLogo: user.businessLogo,
          },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit branding update:',
        socketErr.message,
      );
    }
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const uploadBusinessStamp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Plan check for Business Branding
    if (user.role !== 'super_admin' && user.plan === 'Free') {
      return res.status(403).json({
        message:
          'Business Branding is only available on Basic or Pro plans. Please upgrade to continue.',
      });
    }

    // Delete old business stamp from Cloudinary if it exists
    if (user.businessStamp) {
      const {
        deleteCloudinaryFileByUrl,
      } = require('../utils/cloudinaryHelper');
      await deleteCloudinaryFileByUrl(user.businessStamp, 'image');
    }

    user.businessStamp = req.file.path;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'business_stamp_updated',
      category: 'auth',
      details: 'User uploaded a new business stamp',
      req,
    });

    res.json({
      success: true,
      businessStamp: user.businessStamp,
      message: 'Business stamp updated successfully',
    });

    // Emit branding update event
    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        io.to(`business_${user._id.toString()}`).emit(
          'business:branding_updated',
          {
            businessName: user.businessName,
            businessLogo: user.businessLogo,
            businessStamp: user.businessStamp,
            ceoSignature: user.ceoSignature,
            primaryColor: user.primaryColor,
          },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit branding update:',
        socketErr.message,
      );
    }
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteBusinessStamp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.businessStamp) {
      return res.status(400).json({ message: 'No business stamp to delete' });
    }

    const { deleteCloudinaryFileByUrl } = require('../utils/cloudinaryHelper');
    await deleteCloudinaryFileByUrl(user.businessStamp, 'image');

    user.businessStamp = '';
    await user.save();

    res.json({ success: true, message: 'Business stamp removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadCeoSignature = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Plan check for Business Branding
    if (user.role !== 'super_admin' && user.plan === 'Free') {
      return res.status(403).json({
        message:
          'Business Branding is only available on Basic or Pro plans. Please upgrade to continue.',
      });
    }

    // Delete old signature from Cloudinary if it exists
    if (user.ceoSignature) {
      const {
        deleteCloudinaryFileByUrl,
      } = require('../utils/cloudinaryHelper');
      await deleteCloudinaryFileByUrl(user.ceoSignature, 'image');
    }

    user.ceoSignature = req.file.path;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'ceo_signature_updated',
      category: 'auth',
      details: 'User uploaded a new CEO signature',
      req,
    });

    res.json({
      success: true,
      ceoSignature: user.ceoSignature,
      message: 'CEO signature updated successfully',
    });

    // Emit branding update event
    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        io.to(`business_${user._id.toString()}`).emit(
          'business:branding_updated',
          {
            businessName: user.businessName,
            businessLogo: user.businessLogo,
            businessStamp: user.businessStamp,
            ceoSignature: user.ceoSignature,
            primaryColor: user.primaryColor,
          },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit branding update:',
        socketErr.message,
      );
    }
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteCeoSignature = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.ceoSignature) {
      return res.status(400).json({ message: 'No CEO signature to delete' });
    }

    const { deleteCloudinaryFileByUrl } = require('../utils/cloudinaryHelper');
    await deleteCloudinaryFileByUrl(user.ceoSignature, 'image');

    user.ceoSignature = '';
    await user.save();

    res.json({ success: true, message: 'CEO signature removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteBusinessLogo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Plan check for Business Branding
    if (user.role !== 'super_admin' && user.plan === 'Free') {
      return res.status(403).json({
        message:
          'Business Branding is only available on Basic or Pro plans. Please upgrade to continue.',
      });
    }

    if (!user.businessLogo) {
      return res.status(400).json({ message: 'No business logo to delete' });
    }

    const { deleteCloudinaryFileByUrl } = require('../utils/cloudinaryHelper');
    await deleteCloudinaryFileByUrl(user.businessLogo, 'image');

    user.businessLogo = '';
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'business_logo_deleted',
      category: 'auth',
      details: 'User deleted their business logo',
      req,
    });

    res.json({
      success: true,
      message: 'Business logo deleted successfully',
    });

    // Emit branding update event
    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        const businessId = req.user.effectiveOwnerId || user._id;
        io.to(`business_${businessId.toString()}`).emit(
          'business:branding_updated',
          {
            businessName: user.businessName,
            businessLogo: '',
          },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit branding update:',
        socketErr.message,
      );
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const { isValid, message } = validatePassword(newPassword);
  if (!isValid) {
    return res.status(400).json({ message });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Incorrect current password' });
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

  // SECURITY: respond identically whether the email exists or not. Account
  // enumeration via the password-reset endpoint lets attackers harvest
  // valid user emails for phishing / credential-stuffing.
  const SAFE_RESPONSE = {
    success: true,
    data: 'If an account exists for that email, a reset link has been sent.',
  };

  try {
    const user = await User.findOne({ email: lowercaseEmail });

    if (!user) {
      return res.status(200).json(SAFE_RESPONSE);
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
          // Only allow localhost or the same host for security if CLIENT_URL is missing
          clientUrl = `${url.protocol}//${url.host}`;
        } catch (e) {
          clientUrl = 'http://localhost:5173';
        }
      } else {
        clientUrl = 'http://localhost:5173';
      }
    }

    const resetUrl = `${clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Action Required: Reset Your Security Credentials',
        html: passwordResetEmail(
          resetUrl,
          user.businessName || user.name,
          user.businessLogo,
        ),
      });

      res.status(200).json(SAFE_RESPONSE);

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
      // Still return the safe response — leaking "email could not be sent"
      // here would distinguish valid emails (which trigger a send attempt)
      // from invalid ones. Surface failures via server logs only.
      return res.status(200).json(SAFE_RESPONSE);
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

    const { isValid, message } = validatePassword(req.body.password);
    if (!isValid) {
      return res.status(400).json({ message });
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
    }).populate('roleRef');

    if (!user) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired verification code' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    // Send Welcome Email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to FinFlo!',
        html: welcomeBusinessEmail(
          user.businessName || user.name,
          user.businessLogo,
        ),
      });
    } catch (err) {
      console.error('Welcome email failed to send:', err);
    }

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'email_verified',
      category: 'auth',
      details: `User verified email: ${user.email}`,
      req,
    });

    res
      .cookie('token', generateToken(user._id), cookieOptions)
      .status(200)
      .json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessAbbreviation: user.businessAbbreviation,
        permissions: user.getPermissions(),
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

    const verificationCode = generate6DigitCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Action Required: New Verification Code',
      html: verificationEmail(
        verificationCode,
        user.businessName || user.name,
        user.businessLogo,
      ),
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

// ─── Two-Factor Authentication ───────────────────────────────────────────────

/** Generate a TOTP secret & return a QR code for the authenticator app */
const generate2FA = async (req, res) => {
  const { password } = req.body || {};
  try {
    // SECURITY: require the account password to enable 2FA. Without this,
    // a session-hijacker could enrol their own authenticator and lock the
    // legitimate user out of their own account.
    if (!password) {
      return res.status(400).json({ message: 'Password is required to enable 2FA' });
    }
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isGoogleAuth && !user.password) {
      return res.status(400).json({
        message: 'Cannot enable 2FA on a Google-only account. Set a password first.',
      });
    }
    const passwordOk = await user.matchPassword(password);
    if (!passwordOk) {
      return res.status(400).json({ message: 'Incorrect password' });
    }
    if (user.isTwoFactorEnabled)
      return res.status(400).json({ message: '2FA is already enabled' });

    const secret = authenticator.generateSecret();
    // Temporarily store secret until the user verifies
    user.twoFactorSecret = secret;
    await user.save({ validateBeforeSave: false });

    const appName = 'FinFlo';
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({ qrCode: qrCodeDataUrl, secret });
  } catch (error) {
    console.error('2FA Generate Error:', error);
    res.status(500).json({ message: error.message });
  }
};

/** Verify the OTP code and permanently enable 2FA */
const verify2FA = async (req, res) => {
  const { code } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.twoFactorSecret)
      return res
        .status(400)
        .json({ message: 'No 2FA secret found. Generate one first.' });

    const isValid = await authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!isValid)
      return res.status(400).json({ message: 'Invalid or expired code' });

    user.isTwoFactorEnabled = true;
    await user.save({ validateBeforeSave: false });

    await logActivity({
      userId: user._id,
      action: '2fa_enabled',
      category: 'auth',
      details: 'User enabled Two-Factor Authentication',
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

/** Disable 2FA after validating current password */
const disable2FA = async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isTwoFactorEnabled)
      return res.status(400).json({ message: '2FA is not enabled' });

    if (!(await user.matchPassword(password)))
      return res
        .status(401)
        .json({ message: 'Incorrect password. Cannot disable 2FA.' });

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save({ validateBeforeSave: false });

    await logActivity({
      userId: user._id,
      action: '2fa_disabled',
      category: 'auth',
      details: 'User disabled Two-Factor Authentication',
      req,
    });

    res.json({ success: true, message: 'Two-Factor Authentication disabled.' });
  } catch (error) {
    console.error('2FA Disable Error:', error);
    res.status(500).json({ message: error.message });
  }
};

/** Second step of the 2FA login flow: verify the OTP, return full user payload */
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

    const user = await User.findById(decoded.id).populate('roleRef');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Per-account 2FA attempt lockout: 8 failed codes → 15-minute freeze.
    // Combined with the per-IP otpLimiter this defeats both single-IP and
    // distributed brute-force against the 10⁶ TOTP search space.
    const TFA_LOCK_MS = 15 * 60 * 1000;
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Too many failed 2FA attempts. Try again in ${minutesLeft} minute(s).`,
        locked: true,
      });
    }

    const isValid = await authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!isValid) {
      const nextAttempts = (user.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: nextAttempts };
      if (nextAttempts >= 8) {
        update.lockUntil = Date.now() + TFA_LOCK_MS;
        update.failedLoginAttempts = 0;
      }
      await User.findByIdAndUpdate(user._id, { $set: update });
      return res.status(400).json({ message: 'Invalid or expired 2FA code' });
    }

    // Reset counter on success + update last login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    let isManager = false;
    let branchId = user.branchId;
    if (user.role === 'staff') {
      const managedBranch = await Branch.findOne({ manager: user._id });
      isManager = !!managedBranch;
      if (managedBranch) branchId = managedBranch._id;
    }

    await logActivity({
      userId: user._id,
      action: 'user_login',
      category: 'auth',
      details: `User logged in with 2FA: ${user.email}`,
      req,
    });

    res.cookie('token', generateToken(user._id), cookieOptions).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isManager,
      branchId,
      businessName: user.businessName,
      securityCode: user.securityCode,
      businessAbbreviation: user.businessAbbreviation,
      profilePicture: user.profilePicture,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      permissions: user.getPermissions(),
    });
  } catch (error) {
    console.error('Verify Login 2FA Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const requestPasswordChangeCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit code (CSPRNG)
    const code = generate6DigitCode();
    user.passwordChangeCode = code;
    user.passwordChangeCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Send Email
    try {
      const emailSent = await sendEmail({
        to: user.email,
        subject: 'Security Code for Password Change',
        html: verificationEmail(
          code,
          user.businessName || user.name,
          user.businessLogo,
        ),
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

const forceChangePassword = async (req, res) => {
  const { code, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (
      !user.passwordChangeCode ||
      user.passwordChangeCode !== code ||
      user.passwordChangeCodeExpire < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired security code' });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.passwordChangeCode = undefined;
    user.passwordChangeCodeExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logoutUser = (req, res) => {
  res
    .cookie('token', '', { ...cookieOptions, maxAge: 0 })
    .json({ message: 'Logged out successfully' });
};

const getOnboardingStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.onboardingStatus || { isCompleted: false, currentStep: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOnboardingStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.onboardingStatus = {
      isCompleted: req.body.isCompleted ?? user.onboardingStatus?.isCompleted,
      currentStep: req.body.currentStep ?? user.onboardingStatus?.currentStep,
    };

    await user.save();
    res.json({ success: true, onboardingStatus: user.onboardingStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Google OAuth Authentication ─────────────────────────────────────────────

const googleLogin = async (req, res) => {
  const { googleToken } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: googleAllowedAudiences,
    });
    const payload = ticket.getPayload();
    const { email } = payload;
    const lowercaseEmail = email?.toLowerCase();

    const user = await User.findOne({ email: lowercaseEmail }).populate(
      'roleRef',
    );

    if (!user) {
      // Return 404 to prompt the frontend to switch to registration
      return res.status(404).json({
        message: 'User not found',
        requiresRegistration: true,
        email: lowercaseEmail,
        name: payload.name,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Since this is a Google Login, we trust the email. Mark as verified if not already.
    if (!user.isVerified) {
      user.isVerified = true;
    }

    // Link Google ID if not present
    if (!user.googleId) {
      user.googleId = payload.sub;
      user.isGoogleAuth = true;
    }

    // Auto-update profile picture if none exists. Mirror Google's CDN image
    // to our Cloudinary on first link so subsequent renders don't hammer
    // lh3.googleusercontent.com (which 429s under repeated browser fetches).
    // Also re-mirror legacy records that still hotlink directly to Google.
    const stillHotlinked =
      typeof user.profilePicture === 'string' &&
      /^https?:\/\/lh\d?\.googleusercontent\.com\//i.test(user.profilePicture);
    if ((!user.profilePicture || stillHotlinked) && payload.picture) {
      user.profilePicture = await mirrorRemoteImage(payload.picture);
    }

    await user.save();

    // 2FA Flow
    if (user.isTwoFactorEnabled) {
      const pendingToken = jwt.sign(
        { id: user._id, pending2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' },
      );
      return res.json({ requires2FA: true, pendingToken });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Determine manager status
    let isManager = false;
    let branchId = user.branchId;
    if (user.role === 'staff') {
      const managedBranch = await Branch.findOne({ manager: user._id });
      isManager = !!managedBranch;
      if (managedBranch) branchId = managedBranch._id;

      if (user.ownerId) {
        const owner = await User.findById(user.ownerId);
        if (owner) user.plan = owner.plan;
      }
    }

    await logActivity({
      userId: user._id,
      action: 'user_login_google',
      category: 'auth',
      details: `User logged in via Google: ${user.email}`,
      req,
    });

    const token = generateToken(user._id);

    if (user.mustChangePassword) {
      return res.cookie('token', token, cookieOptions).json({
        token,
        mustChangePassword: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isManager,
        branchId,
        businessName: user.businessName,
        profilePicture: user.profilePicture,
        permissions: user.getPermissions(),
      });
    }

    res.cookie('token', token, cookieOptions).json({
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isManager,
      branchId,
      businessName: user.businessName,
      securityCode: user.securityCode,
      businessAbbreviation: user.businessAbbreviation,
      profilePicture: user.profilePicture,
      currency: user.currency,
      permissions: user.getPermissions(),
    });
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({ message: 'Google authentication failed' });
  }
};

const googleRegister = async (req, res) => {
  const { googleToken } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: googleAllowedAudiences,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;
    const lowercaseEmail = email?.toLowerCase();
    const lowercaseName = name?.toLowerCase();

    const existingUser = await User.findOne({ email: lowercaseEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Mirror Google's CDN avatar to our Cloudinary once at signup so
    // subsequent renders never hotlink lh3.googleusercontent.com (which
    // rate-limits browser fetches with 429).
    const mirroredAvatar = picture ? await mirrorRemoteImage(picture) : '';

    // SECURITY: Never auto-promote to super_admin based on email match.
    // Super admins are provisioned out-of-band only.
    const user = await User.create({
      name: lowercaseName,
      email: lowercaseEmail,
      googleId,
      isGoogleAuth: true,
      profilePicture: mirroredAvatar,
      role: 'admin',
      isVerified: true, // Auto-verify since Google verified it
    });

    // Notify Super Admin of every Google-based registration.
    {
      try {
        const superAdmin = await User.findOne({ role: 'super_admin' });
        if (superAdmin) {
          await sendEmail({
            to: superAdmin.email,
            subject: `New Business Registration (Google): ${user.name}`,
            html: superAdminNewRegistrationEmail({
              name: user.name,
              email: user.email,
            }),
          });

          await Notification.create({
            recipient: superAdmin._id,
            recipientModel: 'User',
            title: 'New Business Registration',
            message: `${user.name} (${user.email}) has registered via Google.`,
            type: 'info',
            link: '/super-admin/users',
          });
        }
      } catch (err) {
        console.error('Super Admin notification failed:', err);
      }
    }

    // Send Welcome Email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to FinFlo!',
        html: welcomeBusinessEmail(
          user.businessName || user.name,
          user.businessLogo,
        ),
      });
    } catch (err) {
      console.error('Welcome email failed to send:', err);
    }

    await logActivity({
      userId: user._id,
      action: 'user_register_google',
      category: 'auth',
      details: `New user registered via Google: ${user.email}`,
      req,
    });

    const token = generateToken(user._id);

    res.cookie('token', token, cookieOptions).status(201).json({
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isManager: false,
      branchId: null,
      businessName: user.businessName,
      securityCode: user.securityCode,
      businessAbbreviation: user.businessAbbreviation,
      profilePicture: user.profilePicture,
      currency: user.currency,
      permissions: user.getPermissions(),
      message: 'Registration successful.',
    });
  } catch (error) {
    console.error('Google Register Error:', error);
    res.status(500).json({ message: 'Google registration failed' });
  }
};

module.exports = {
  logoutUser,
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
  generate2FA,
  verify2FA,
  disable2FA,
  verifyLogin2FA,
  requestPasswordChangeCode,
  forceChangePassword,
  getOnboardingStatus,
  updateOnboardingStatus,
  googleLogin,
  googleRegister,
  uploadBusinessLogo,
  deleteBusinessLogo,
  uploadBusinessStamp,
  deleteBusinessStamp,
  uploadCeoSignature,
  deleteCeoSignature,
};
