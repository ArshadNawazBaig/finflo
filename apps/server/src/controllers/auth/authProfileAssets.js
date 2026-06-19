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

const updateDetails = async (req, res) => {
  if (req.body.email) {
    const { validateEmail } = require('../../utils/emailValidator');
    const emailValidation = validateEmail(req.body.email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.message });
    }
  }
  const fieldsToUpdate = {
    name: req.body.name?.toLowerCase(),
    email: req.body.email?.toLowerCase(),
    businessName: req.body.businessName,
    businessType: req.body.businessType,
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
      const { getIO } = require('../../utils/socketInstance');
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
      } = require('../../utils/cloudinaryHelper');
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
      const { getIO } = require('../../utils/socketInstance');
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
      } = require('../../utils/cloudinaryHelper');
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
      const { getIO } = require('../../utils/socketInstance');
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
      } = require('../../utils/cloudinaryHelper');
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
      const { getIO } = require('../../utils/socketInstance');
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
      const { getIO } = require('../../utils/socketInstance');
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

module.exports = {
  updateDetails,
  uploadProfilePicture,
  uploadBusinessLogo,
  uploadBusinessStamp,
  deleteBusinessStamp,
  uploadCeoSignature,
  deleteCeoSignature,
  deleteBusinessLogo,
};
