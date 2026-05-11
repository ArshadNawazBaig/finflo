const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Member = require('../models/Member');
const { sendEmail } = require('../utils/email');

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 30;
const PIN_TOKEN_EXPIRY = '5m';

/**
 * @desc    Set or change transaction PIN
 * @route   POST /api/members/portal/set-pin
 * @access  Private (Member)
 */
const setTransactionPin = async (req, res) => {
  const { pin, currentPassword } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be exactly 4 digits.' });
  }

  if (!currentPassword) {
    return res.status(400).json({ message: 'Current password is required to set PIN.' });
  }

  try {
    const member = await Member.findById(req.member._id).select('+password +transactionPin');
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    // Verify current password
    const isMatch = await member.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    // Hash and store the PIN
    const salt = await bcrypt.genSalt(10);
    member.transactionPin = await bcrypt.hash(pin, salt);
    member.transactionPinSetAt = new Date();
    member.pinFailedAttempts = 0;
    member.pinLockedUntil = undefined;
    await member.save({ validateBeforeSave: false });

    res.json({ message: 'Transaction PIN set successfully.' });
  } catch (error) {
    console.error('setTransactionPin Error:', error);
    res.status(500).json({ message: 'Failed to set transaction PIN.' });
  }
};

/**
 * @desc    Verify transaction PIN and return a short-lived token
 * @route   POST /api/members/portal/verify-pin
 * @access  Private (Member)
 */
const verifyTransactionPin = async (req, res) => {
  const { pin } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be exactly 4 digits.' });
  }

  try {
    const member = await Member.findById(req.member._id).select('+transactionPin');
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    if (!member.transactionPin) {
      return res.status(400).json({ message: 'Transaction PIN not set. Please set your PIN first.', code: 'PIN_NOT_SET' });
    }

    // Check lockout
    if (member.pinLockedUntil && member.pinLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((member.pinLockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `PIN locked. Try again in ${minutesLeft} minute(s), or use OTP reset.`,
        code: 'PIN_LOCKED',
        lockedUntil: member.pinLockedUntil,
      });
    }

    // Verify PIN
    const isMatch = await bcrypt.compare(pin, member.transactionPin);
    if (!isMatch) {
      member.pinFailedAttempts = (member.pinFailedAttempts || 0) + 1;

      if (member.pinFailedAttempts >= PIN_MAX_ATTEMPTS) {
        member.pinLockedUntil = new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000);
        await member.save({ validateBeforeSave: false });
        return res.status(423).json({
          message: `Too many failed attempts. PIN locked for ${PIN_LOCKOUT_MINUTES} minutes. Use OTP to reset.`,
          code: 'PIN_LOCKED',
          lockedUntil: member.pinLockedUntil,
        });
      }

      await member.save({ validateBeforeSave: false });
      return res.status(422).json({
        message: 'Incorrect PIN.',
        code: 'WRONG_PIN',
        attemptsRemaining: PIN_MAX_ATTEMPTS - member.pinFailedAttempts,
      });
    }

    // Success — reset attempts and issue token
    member.pinFailedAttempts = 0;
    member.pinLockedUntil = undefined;
    await member.save({ validateBeforeSave: false });

    const transactionToken = jwt.sign(
      { id: member._id, type: 'transaction_pin' },
      process.env.JWT_SECRET,
      { expiresIn: PIN_TOKEN_EXPIRY },
    );

    res.json({ token: transactionToken, expiresIn: 300 }); // 5 min in seconds
  } catch (error) {
    console.error('verifyTransactionPin Error:', error);
    res.status(500).json({ message: 'Failed to verify PIN.' });
  }
};

/**
 * @desc    Request OTP to reset PIN (sends to member email)
 * @route   POST /api/members/portal/pin-reset-otp
 * @access  Private (Member)
 */
const requestPinResetOtp = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Store OTP hash with 10 min expiry
    member.resetPasswordToken = otpHash;
    member.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await member.save({ validateBeforeSave: false });

    // Send OTP via email
    await sendEmail({
      to: member.email,
      subject: 'Transaction PIN Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">PIN Reset Verification</h2>
          <p>Your OTP to reset your transaction PIN is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'OTP sent to your registered email.' });
  } catch (error) {
    console.error('requestPinResetOtp Error:', error);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
};

/**
 * @desc    Verify OTP and reset PIN
 * @route   POST /api/members/portal/pin-reset-verify
 * @access  Private (Member)
 */
const verifyPinResetOtp = async (req, res) => {
  const { otp, newPin } = req.body;

  if (!otp) {
    return res.status(400).json({ message: 'OTP is required.' });
  }

  // If newPin is provided, validate it
  if (newPin && !/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ message: 'PIN must be exactly 4 digits.' });
  }

  try {
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    const member = await Member.findOne({
      _id: req.member._id,
      resetPasswordToken: otpHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!member) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    if (newPin) {
      // Mode 1: Reset to a new PIN immediately
      const salt = await bcrypt.genSalt(10);
      member.transactionPin = await bcrypt.hash(newPin, salt);
      member.transactionPinSetAt = new Date();
    } else {
      // Mode 2: Just clear the PIN so user can set a new one
      member.transactionPin = undefined;
      member.transactionPinSetAt = undefined;
    }

    member.pinFailedAttempts = 0;
    member.pinLockedUntil = undefined;
    member.resetPasswordToken = undefined;
    member.resetPasswordExpire = undefined;
    await member.save({ validateBeforeSave: false });

    res.json({ message: newPin ? 'Transaction PIN reset successfully.' : 'PIN cleared. Please set a new PIN.' });
  } catch (error) {
    console.error('verifyPinResetOtp Error:', error);
    res.status(500).json({ message: 'Failed to reset PIN.' });
  }
};

/**
 * @desc    Check if member has PIN set
 * @route   GET /api/members/portal/pin-status
 * @access  Private (Member)
 */
const getPinStatus = async (req, res) => {
  try {
    const member = await Member.findById(req.member._id).select('+transactionPin');
    const hasPin = !!member?.transactionPin;
    const isLocked = !!(member?.pinLockedUntil && member.pinLockedUntil > new Date());
    res.json({
      hasPin,
      hasPinSet: hasPin, // backward compat
      isLocked,
      pinSetAt: member?.transactionPinSetAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get PIN status.' });
  }
};

module.exports = {
  setTransactionPin,
  verifyTransactionPin,
  requestPinResetOtp,
  verifyPinResetOtp,
  getPinStatus,
};
