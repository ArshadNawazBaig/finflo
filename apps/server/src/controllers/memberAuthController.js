const Member = require('../models/Member');
const { OAuth2Client } = require('google-auth-library');
const { getFriendlyErrorMessage } = require('../utils/errorHandler');
const { mirrorRemoteImage } = require('../utils/cloudinaryHelper');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Accept tokens from both Web and Android native OAuth clients
const googleAllowedAudiences = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
].filter(Boolean);

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const generate6DigitCode = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
const { logActivity } = require('./activityLogController');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { sendEmail } = require('../utils/email');
const {
  verificationEmail,
  passwordResetEmail,
} = require('../utils/emailTemplates');
const { validatePassword } = require('../utils/validation');

const generateToken = (id) => {
  // type: 'member' prevents a User-collection token from being accepted by
  // the Member middleware (and vice versa) — protects against cross-collection
  // ObjectId collisions/token confusion.
  return jwt.sign({ id, type: 'member' }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // SameSite=None required for cross-origin (Vercel frontend → Railway backend)
  // SameSite=Lax is fine for same-origin (local dev)
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
    }).populate(
      'user',
      'name businessName businessLogo businessAddress businessStamp ceoSignature securityCode plan subscriptionStatus',
    );

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

    if (member.isGoogleAuth && !member.password) {
      return res.status(401).json({
        message:
          'This account is registered via Google. Please use the Google Login option.',
      });
    }

    // ── Brute-force protection ─────────────────────────────────────────────
    // Mirrors the User-side lockout: 5 failed attempts → 15-minute lock.
    // The fields are written via $set/$inc so a missing-field schema does not
    // throw — they are treated as zero/undefined transparently.
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCK_TIME_MS = 15 * 60 * 1000;
    if (member.lockUntil && member.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((member.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        locked: true,
      });
    }

    if (await member.matchPassword(password)) {
      // Reset attempt counter on success.
      if (member.failedLoginAttempts || member.lockUntil) {
        await Member.findByIdAndUpdate(member._id, {
          $set: { failedLoginAttempts: 0, lockUntil: null },
        });
      }
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
          token,
          mustChangePassword: true,
          _id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
          profilePicture: member.profilePicture,
          businessLogo: member.user?.businessLogo,
          businessStamp: member.user?.businessStamp,
          ceoSignature: member.user?.ceoSignature,
          businessName: member.user?.businessName,
          plan: member.user?.plan,
          subscriptionStatus: member.user?.subscriptionStatus,
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
        token,
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        profilePicture: member.profilePicture,
        businessLogo: member.user?.businessLogo,
        businessName: member.user?.businessName,
        plan: member.user?.plan,
        subscriptionStatus: member.user?.subscriptionStatus,
        mustChangePassword: false,
        business: member.user, // The business this member belongs to
      });
    } else {
      // Track failed attempt + lock if threshold reached.
      const nextAttempts = (member.failedLoginAttempts || 0) + 1;
      const update = { $set: { failedLoginAttempts: nextAttempts } };
      if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
        update.$set.lockUntil = Date.now() + LOCK_TIME_MS;
        update.$set.failedLoginAttempts = 0;
      }
      await Member.findByIdAndUpdate(member._id, update);
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Member Login Error:', error);
    res.status(500).json({ message: getFriendlyErrorMessage(error) });
  }
};

// @desc    Google auth member & get token
// @route   POST /api/auth/member/google-login
// @access  Public
const googleLogin = async (req, res) => {
  const { googleToken, securityCode } = req.body;

  try {
    if (!googleToken || !securityCode) {
      return res.status(400).json({
        message: 'Please provide Google token and business security code',
      });
    }

    const User = require('../models/User');
    const business = await User.findOne({
      securityCode: securityCode.toUpperCase(),
    });

    if (!business) {
      return res
        .status(401)
        .json({ message: 'Invalid business security code' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: googleAllowedAudiences,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture: profilePicture } = payload;
    const emailLower = email.toLowerCase();

    const member = await Member.findOne({
      user: business._id,
      $or: [{ email: emailLower }, { googleId }],
    }).populate('user', 'name businessName businessLogo securityCode');

    if (!member) {
      return res.status(404).json({
        requiresRegistration: true,
        email: emailLower,
        name,
        googleId,
        profilePicture,
        message:
          'Account not found. Additional information required to register.',
      });
    }

    if (!member.isActive) {
      return res
        .status(403)
        .json({ message: 'Account is inactive. Contact admin.' });
    }

    // First-time Google link, OR existing record still hotlinked to Google's
    // CDN — re-mirror to our own storage. Google's CDN rate-limits browser
    // fetches (429) once the same URL is fetched too many times across the
    // app, which breaks avatars; mirroring decouples display from their CDN.
    const stillHotlinked =
      typeof member.profilePicture === 'string' &&
      /^https?:\/\/lh\d?\.googleusercontent\.com\//i.test(member.profilePicture);

    // A Google-authenticated member never needs the forced password change that
    // admin-created accounts get — they have no password to rotate, and Google
    // is a stronger identity proof than the one-time temp password. Clear the
    // flag in the DB so getMe() (which returns the raw document) can't re-trigger
    // the "Security Update Required" gate on the next data sync.
    const needsGoogleLink = !member.googleId;
    const needsFlagClear = member.mustChangePassword;

    if (needsGoogleLink || stillHotlinked || needsFlagClear) {
      if (needsGoogleLink) {
        member.googleId = googleId;
        member.isGoogleAuth = true;
      }
      if ((!member.profilePicture || stillHotlinked) && profilePicture) {
        member.profilePicture = await mirrorRemoteImage(profilePicture);
      }
      if (needsFlagClear) {
        member.mustChangePassword = false;
      }
      await member.save({ validateBeforeSave: false });
    }

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

    await Member.findByIdAndUpdate(member._id, { lastLoginAt: new Date() });

    const token = generateToken(member._id);

    await logActivity({
      userId: member._id,
      action: 'member_login',
      category: 'auth',
      details: `Member logged in via Google: ${member.email}`,
      req,
    });

    res.cookie('token', token, cookieOptions).json({
      token,
      _id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      profilePicture: member.profilePicture,
      businessLogo: member.user?.businessLogo,
      businessName: member.user?.businessName,
      plan: member.user?.plan,
      subscriptionStatus: member.user?.subscriptionStatus,
      mustChangePassword: false,
      business: member.user,
    });
  } catch (error) {
    console.error('Member Google Login Error:', error);
    res.status(500).json({ message: 'Google authentication failed' });
  }
};

// @desc    Register member via Google Auth
// @route   POST /api/auth/member/google-register
// @access  Public
const googleRegister = async (req, res) => {
  const { googleToken, securityCode, cnic, phone } = req.body;

  try {
    if (!googleToken || !securityCode || !cnic || !phone) {
      return res.status(400).json({
        message:
          'Please provide all required fields (token, security code, CNIC, phone)',
      });
    }

    const User = require('../models/User');
    const Customer = require('../models/Customer');
    const businessOwner = await User.findOne({
      securityCode: securityCode.toUpperCase(),
      role: 'admin',
    });

    if (!businessOwner) {
      return res
        .status(404)
        .json({ message: 'Invalid business security code' });
    }

    // The business must have a branch before accepting members. New members are
    // attributed to the tenant's default branch (movable by an admin afterwards).
    const { getDefaultBranchId } = require('../utils/branchUtils');
    const defaultBranchId = await getDefaultBranchId(businessOwner._id);
    if (!defaultBranchId) {
      return res.status(400).json({
        message: 'This business is not accepting registrations yet.',
        code: 'NO_BRANCH',
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: googleAllowedAudiences,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture: profilePicture } = payload;
    const emailLower = email.toLowerCase();

    const existingMember = await Member.findOne({
      user: businessOwner._id,
      $or: [{ phone }, { cnic }, { email: emailLower }, { googleId }],
    });

    if (existingMember) {
      const conflictField =
        existingMember.phone === phone
          ? 'phone number'
          : existingMember.cnic === cnic
            ? 'CNIC'
            : 'email/Google account';
      return res.status(400).json({
        message: `A member with this ${conflictField} already exists in this business`,
      });
    }

    // Mirror Google's CDN avatar once at signup so we don't hotlink to
    // lh3.googleusercontent.com (which 429s under repeated browser fetches).
    const mirroredAvatar = await mirrorRemoteImage(profilePicture);

    const member = await Member.create({
      user: businessOwner._id,
      branchId: defaultBranchId,
      name,
      phone,
      email: emailLower,
      cnic,
      googleId,
      isGoogleAuth: true,
      profilePicture: mirroredAvatar,
      approvalStatus: 'pending',
      isActive: false,
    });

    businessOwner.customerCount = (businessOwner.customerCount || 0) + 1;
    await businessOwner.save();

    try {
      let customer = await Customer.findOne({
        user: businessOwner._id,
        $or: [{ cnic }, { email: emailLower }],
      });

      if (!customer) {
        customer = await Customer.create({
          user: businessOwner._id,
          branchId: defaultBranchId,
          name,
          phone,
          email: emailLower,
          cnic,
          isMember: true,
          memberId: member._id,
          profilePicture: mirroredAvatar,
        });
      } else {
        await Customer.findByIdAndUpdate(customer._id, {
          isMember: true,
          memberId: member._id,
        });
      }
      await Member.findByIdAndUpdate(member._id, { customer: customer._id });
    } catch (customerError) {
      console.error('Auto-create customer error (non-fatal):', customerError);
    }

    try {
      const {
        notifyAdminsOfMemberAction,
      } = require('../utils/notificationHelper');
      await notifyAdminsOfMemberAction({
        title: 'New Member Google Registration Pending',
        message: `${name} has registered via Google and is awaiting account approval.`,
        type: 'info',
        ownerId: businessOwner._id,
        link: '/members?type=pending',
        metadata: { memberId: member._id, phone },
      });
    } catch (notifError) {
      console.error(
        'Failed to notify admins of new Google registration:',
        notifError,
      );
    }

    try {
      const { getIO } = require('../utils/socketInstance');
      const io = getIO();
      if (io) {
        io.to(`business_${businessOwner._id.toString()}`).emit(
          'member:new_registration',
          { memberId: member._id, name: member.name },
        );
      }
    } catch (socketErr) {
      console.error(
        '[Socket] Failed to emit member:new_registration:',
        socketErr.message,
      );
    }

    await logActivity({
      userId: businessOwner._id,
      action: 'member_registration_pending',
      category: 'admin',
      details: `New Google self-registration request from ${name}`,
      metadata: { memberId: member._id, phone },
      req,
    });

    res.status(201).json({
      message:
        'Registration successful. Your account is pending admin approval.',
      memberId: member._id,
    });
  } catch (error) {
    console.error('Member Google Register Error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// @desc    Get current member profile
// @route   GET /api/auth/member/me
// @access  Private (Member)
const getMe = async (req, res) => {
  try {
    const User = require('../models/User');
    const Loan = require('../models/Loan');
    // req.member set by protectMember middleware
    const member = await Member.findById(req.member._id).populate(
      'user',
      'name businessName businessLogo businessAddress businessStamp ceoSignature plan subscriptionStatus',
    );

    if (member) {
      const memberObj = member.toObject();
      // Expose the admin's subscription plan for the premium gate in MemberChat
      memberObj.adminPlan = member.user?.plan || 'Free';
      memberObj.subscriptionStatus =
        member.user?.subscriptionStatus || 'active';
      memberObj.businessLogo = member.user?.businessLogo;
      memberObj.businessStamp = member.user?.businessStamp;
      memberObj.ceoSignature = member.user?.ceoSignature;
      memberObj.businessName = member.user?.businessName;
      memberObj.businessAddress = member.user?.businessAddress;

      // Loan + grade + credit score for this member (via linked customer).
      if (member.customer) {
        // These three reads are independent of one another — run them in
        // parallel instead of three serial round-trips on this hot, per-session
        // endpoint. The credit score is best-effort: a failure resolves to null
        // (omit the card) rather than rejecting the whole dashboard.
        const {
          computeCreditScore,
        } = require('../services/creditScoringService');
        const loanFilter = {
          customer: member.customer,
          user: member.user._id,
        };
        const [activeLoan, gradedLoan, cs] = await Promise.all([
          Loan.findOne({ ...loanFilter, status: { $in: ['active', 'overdue'] } })
            .sort({ createdAt: -1 })
            .select(
              'remainingAmount totalAmount principal paidAmount emi status',
            ),
          Loan.findOne({ ...loanFilter, 'riskDetails.grade': { $exists: true } })
            .sort({ createdAt: -1 })
            .select('riskDetails'),
          computeCreditScore(member.customer).catch(() => null),
        ]);

        if (activeLoan) {
          memberObj.activeLoan = {
            _id: activeLoan._id,
            remainingAmount: activeLoan.remainingAmount,
            totalAmount: activeLoan.totalAmount,
            principal: activeLoan.principal,
            paidAmount: activeLoan.paidAmount,
            emi: activeLoan.emi,
            status: activeLoan.status,
          };
        }

        if (gradedLoan?.riskDetails) {
          memberObj.memberGrade = {
            grade: gradedLoan.riskDetails.grade,
            score: gradedLoan.riskDetails.score,
            suggestion: gradedLoan.riskDetails.suggestion,
            factors: gradedLoan.riskDetails.factors || [],
          };
        }

        // ── Credit Score — authoritative engine ──────────────────
        // Single source of truth: the SAME 0-100 model that drives the member's
        // credit limit and loan eligibility (creditScoringService), mapped to
        // the familiar 300-850 gauge so a member never sees a number that
        // contradicts what actually governs their borrowing.
        if (cs) {
          const displayScore = 300 + Math.round((cs.score / 100) * 550);
          memberObj.creditScore = {
            score: displayScore, // 300-850 for the gauge
            grade: cs.band, // Excellent / Good / Fair / Poor / Very Poor
            factors: cs.factors,
            rawScore: cs.score, // 0-100 (authoritative)
          };
        }
      }

      res.json(memberObj);
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

  const { isValid, message } = validatePassword(newPassword);
  if (!isValid) {
    return res.status(400).json({ message });
  }

  try {
    const member = await Member.findById(req.member._id).select('+password');

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (!(await member.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Incorrect current password' });
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

  // SECURITY: respond identically whether the business code or member email
  // exists. Prior responses distinguished "Invalid business security code"
  // from "No member found", letting attackers enumerate both axes.
  const SAFE_RESPONSE = {
    success: true,
    data: 'If a matching member account exists, a reset link has been sent.',
  };

  try {
    // 1. Find business by security code
    const User = require('../models/User');
    const business = await User.findOne({
      securityCode: securityCode?.toUpperCase(),
    });

    if (!business) {
      return res.status(200).json(SAFE_RESPONSE);
    }

    // 2. Find member in this business
    const member = await Member.findOne({
      email: email?.toLowerCase().trim(),
      user: business._id,
    });

    if (!member) {
      return res.status(200).json(SAFE_RESPONSE);
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

    try {
      await sendEmail({
        to: member.email,
        subject: 'Reset Your Member Portal Password',
        html: passwordResetEmail(
          resetUrl,
          member.user?.businessName || member.user?.name,
          business.businessLogo,
        ),
      });

      res.status(200).json(SAFE_RESPONSE);

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
      return res.status(200).json(SAFE_RESPONSE);
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

    const { isValid, message } = validatePassword(req.body.password);
    if (!isValid) {
      return res.status(400).json({ message });
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
  const { password } = req.body || {};
  try {
    if (!password) {
      return res.status(400).json({ message: 'Password is required to enable 2FA' });
    }
    const member = await Member.findById(req.member._id).select('+password');
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.isGoogleAuth && !member.password) {
      return res.status(400).json({
        message: 'Cannot enable 2FA on a Google-only account. Set a password first.',
      });
    }
    const passwordOk = await member.matchPassword(password);
    if (!passwordOk) {
      return res.status(400).json({ message: 'Incorrect password' });
    }
    if (member.isTwoFactorEnabled)
      return res.status(400).json({ message: '2FA is already enabled' });

    const secret = authenticator.generateSecret();
    // Temporarily store secret until the user verifies
    member.twoFactorSecret = secret;
    await member.save({ validateBeforeSave: false });

    const appName = 'FinFlo';
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
      return res.status(400).json({ message: 'Incorrect password' });
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
      'name businessName securityCode plan subscriptionStatus',
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

    const newToken = generateToken(member._id);
    res.cookie('token', newToken, cookieOptions).json({
      token: newToken,
      _id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      profilePicture: member.profilePicture,
      businessLogo: member.user?.businessLogo,
      businessName: member.user?.businessName,
      plan: member.user?.plan,
      subscriptionStatus: member.user?.subscriptionStatus,
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
    const member = await Member.findById(req.member._id).populate(
      'user',
      'businessName name businessLogo',
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Generate 6-digit code (CSPRNG)
    const code = generate6DigitCode();
    member.passwordChangeCode = code;
    member.passwordChangeCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await member.save({ validateBeforeSave: false });

    // Send Email
    try {
      const emailSent = await sendEmail({
        to: member.email,
        subject: 'Security Code for Password Change',
        html: verificationEmail(
          code,
          member.user?.businessName || member.user?.name,
          member.user?.businessLogo,
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

const forceMemberChangePassword = async (req, res) => {
  const { code, newPassword } = req.body;

  const { isValid, message } = validatePassword(newPassword);
  if (!isValid) {
    return res.status(400).json({ message });
  }

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

// @desc    Update notification preferences
// @route   PUT /api/member-auth/notification-preferences
// @access  Private (Member)
const updateNotificationPreferences = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Deep-merge each provided channel (email | inApp | sms | push).
    const prefs = member.notificationPreferences;
    for (const channel of ['email', 'inApp', 'sms', 'push']) {
      const incoming = req.body[channel];
      if (!incoming) continue;
      const current = prefs[channel]?.toObject?.() || prefs[channel] || {};
      prefs[channel] = { ...current, ...incoming };
    }

    await member.save({ validateBeforeSave: false });

    res.json({
      success: true,
      notificationPreferences: member.notificationPreferences,
    });
  } catch (error) {
    console.error('Update Notification Preferences Error:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
};

const logoutMember = (req, res) => {
  res
    .cookie('token', '', { ...cookieOptions, maxAge: 0 })
    .json({ message: 'Logged out successfully' });
};

const getOnboardingStatus = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member.onboardingStatus || { isCompleted: false, currentStep: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOnboardingStatus = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    member.onboardingStatus = {
      isCompleted: req.body.isCompleted ?? member.onboardingStatus?.isCompleted,
      currentStep: req.body.currentStep ?? member.onboardingStatus?.currentStep,
    };

    await member.save();
    res.json({ success: true, onboardingStatus: member.onboardingStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  logoutMember,
  loginMember,
  googleLogin,
  googleRegister,
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
  getOnboardingStatus,
  updateOnboardingStatus,
  updateNotificationPreferences,
};
