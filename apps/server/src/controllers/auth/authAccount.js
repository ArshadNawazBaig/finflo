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

module.exports = {
  deleteAccount,
  deleteProfilePicture,
};
