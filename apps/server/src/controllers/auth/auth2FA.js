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

module.exports = {
  generate2FA,
  verify2FA,
  disable2FA,
  verifyLogin2FA,
  requestPasswordChangeCode,
  forceChangePassword,
};
