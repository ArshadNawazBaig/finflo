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
      // Account already exists — log them in instead of erroring, so
      // "Continue with Google" works whether the account is new or existing.
      if (!existingUser.isActive) {
        return res.status(403).json({
          message:
            'Your account has been deactivated. Please contact support.',
        });
      }

      // Link the Google identity / mark verified on first Google sign-in.
      if (!existingUser.googleId) {
        existingUser.googleId = googleId;
        existingUser.isGoogleAuth = true;
      }
      if (!existingUser.isVerified) existingUser.isVerified = true;
      existingUser.lastLoginAt = new Date();
      await existingUser.save({ validateBeforeSave: false });

      // Covers the user who signed up via email/password but never verified,
      // then completes first sign-in through Google — they've still never been
      // welcomed. No-ops for anyone already emailed.
      await sendWelcomeEmailOnce(existingUser);

      if (existingUser.isTwoFactorEnabled) {
        const pendingToken = jwt.sign(
          { id: existingUser._id, pending2FA: true },
          process.env.JWT_SECRET,
          { expiresIn: '5m' },
        );
        return res.json({ requires2FA: true, pendingToken });
      }

      const loginToken = generateToken(existingUser._id);
      return res.cookie('token', loginToken, cookieOptions).json({
        token: loginToken,
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        isManager: false,
        branchId: existingUser.branchId || null,
        businessName: existingUser.businessName,
        securityCode: existingUser.securityCode,
        businessAbbreviation: existingUser.businessAbbreviation,
        profilePicture: existingUser.profilePicture,
        currency: existingUser.currency,
        permissions: existingUser.getPermissions(),
        message: 'Logged in successfully.',
      });
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

    // Send Welcome Email (first-ever signup for this account)
    await sendWelcomeEmailOnce(user);

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
  googleLogin,
  googleRegister,
};
