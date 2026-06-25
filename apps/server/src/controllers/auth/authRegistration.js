const User = require('../../models/User');
const Member = require('../../models/Member');
const Customer = require('../../models/Customer');
const Loan = require('../../models/Loan');
const Repayment = require('../../models/Repayment');
const Investment = require('../../models/Investment');
const ProfitDistribution = require('../../models/ProfitDistribution');
const SavingGoal = require('../../models/SavingGoal');
const Payment = require('../../models/Payment');
const Notification = require('../../models/Notification');
const SupportTicket = require('../../models/SupportTicket');
const ActivityLog = require('../../models/ActivityLog');
const Branch = require('../../models/Branch');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Cryptographically random 6-digit verification code. Math.random is not
// suitable for security-bearing OTPs (predictable PRNG state).
const generate6DigitCode = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
const { logActivity } = require('../activityLogController');
const { sendEmail } = require('../../utils/email');
const {
  verificationEmail,
  passwordResetEmail,
  welcomeBusinessEmail,
  superAdminNewRegistrationEmail,
} = require('../../utils/emailTemplates');
const { deleteCloudinaryFileByUrl, mirrorRemoteImage } = require('../../utils/cloudinaryHelper');
const { validatePassword } = require('../../utils/validation');
const { getFriendlyErrorMessage } = require('../../utils/errorHandler');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Accept tokens from both Web and Android native OAuth clients
const googleAllowedAudiences = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
].filter(Boolean);

const { establishSession } = require('../../utils/authCookies');

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

// Sends the business welcome email exactly once per user. Idempotent via the
// welcomeEmailSentAt stamp, so it's safe to call from every first-signup path
// (email verification, Google signup, first Google sign-in of an unverified
// email/password account) without ever double-emailing. Best-effort: a mail
// failure is logged, never thrown — it must not block the signup response.
const sendWelcomeEmailOnce = async (user) => {
  if (user.welcomeEmailSentAt) return;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Welcome to FinFlo!',
      html: welcomeBusinessEmail(
        user.businessName || user.name,
        user.businessLogo,
      ),
    });
    user.welcomeEmailSentAt = new Date();
    await user.save({ validateBeforeSave: false });
  } catch (err) {
    console.error('Welcome email failed to send:', err);
  }
};

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  const { validateEmail } = require('../../utils/emailValidator');
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

      // Open a revocable session (refresh + csrf cookies) and mint the access
      // token FROM it: the session token carries the `sid` claim and honours
      // ACCESS_TOKEN_TTL, so short-lived access tokens + silent refresh work
      // end-to-end. Fall back to the legacy 1d token if the session couldn't be
      // created (best-effort — must never block login).
      const sessionResult = await establishSession(req, res, {
        principalId: user._id,
        principalModel: 'User',
        tenant: user.role === 'staff' ? user.ownerId : user._id,
      });
      const token = sessionResult?.accessToken || generateToken(user._id);

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
            'plan payrollEnabled businessName businessLogo businessAddress businessAbbreviation businessStamp ceoSignature',
          );
          if (owner) {
            user.plan = owner.plan;
            // Feature flags live on the owner — surface payroll to staff so the
            // sidebar/menu gate (manage_payroll + payrollEnabled) can resolve.
            user.payrollEnabled = owner.payrollEnabled;
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
        payrollEnabled: user.payrollEnabled || false,
        subscriptionStatus: user.subscriptionStatus,
        customerCount: user.customerCount,
        businessName: user.businessName,
        businessType: user.businessType,
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

module.exports = {
  registerUser,
  loginUser,
  getMe,
  sendWelcomeEmailOnce,
};
