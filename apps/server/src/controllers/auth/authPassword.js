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

const {
  establishSession,
  currentRefreshSid,
} = require('../../utils/authCookies');
const { revokeAllForPrincipal } = require('../../services/tokenService');

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

    // Security: a password change revokes the user's OTHER sessions (keeping the
    // current one) so a stolen/compromised session can't outlive the change.
    // Best-effort — must never fail the password update itself.
    try {
      await revokeAllForPrincipal({
        principalId: user._id,
        principalModel: 'User',
        reason: 'password_changed',
        exceptSessionId: currentRefreshSid(req),
      });
    } catch (revokeErr) {
      console.error('[Auth] session revoke on password change failed:', revokeErr.message);
    }

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

    // A reset is the compromise-recovery path: revoke ALL of the user's sessions
    // (there's no "current" one to keep here). Best-effort.
    try {
      await revokeAllForPrincipal({
        principalId: user._id,
        principalModel: 'User',
        reason: 'password_changed',
      });
    } catch (revokeErr) {
      console.error('[Auth] session revoke on password reset failed:', revokeErr.message);
    }

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

    // Send Welcome Email (once, on first verification)
    await sendWelcomeEmailOnce(user);

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'email_verified',
      category: 'auth',
      details: `User verified email: ${user.email}`,
      req,
    });

    // Mint the access token from the revocable session (carries `sid`, honours
    // ACCESS_TOKEN_TTL); fall back to the legacy 1d token if it couldn't open.
    const sessionResult = await establishSession(req, res, {
      principalId: user._id,
      principalModel: 'User',
      tenant: user.role === 'staff' ? user.ownerId : user._id,
    });
    const token = sessionResult?.accessToken || generateToken(user._id);

    res
      .cookie('token', token, cookieOptions)
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

module.exports = {
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationCode,
};
