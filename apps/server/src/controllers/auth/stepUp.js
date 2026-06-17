const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const User = require('../../models/User');
const Member = require('../../models/Member');
const { logActivity } = require('../activityLogController');

// Step-up proof lifetime: how long a single re-auth keeps sensitive actions
// unlocked. Env-tunable; defaults to 15 minutes (matches the access-token TTL).
const STEP_UP_TTL = process.env.STEP_UP_TOKEN_TTL || '15m';
const STEP_UP_TTL_SECONDS = Number(process.env.STEP_UP_TOKEN_TTL_SECONDS || 900);

// Resolve the calling principal — a business user (`protect`) or a portal
// member (`protectMember`) — so one handler serves both /api/auth/reauth and
// /api/member-auth/reauth.
const principalRef = (req) =>
  req.user
    ? { Model: User, id: req.user._id, model: 'User' }
    : req.member
      ? { Model: Member, id: req.member._id, model: 'Member' }
      : null;

/**
 * @desc   Re-authenticate (step-up) and mint a short-lived proof that unlocks
 *         high-risk actions for STEP_UP_TTL. Adaptive factor: a TOTP code when
 *         the account has 2FA enabled, otherwise the account password.
 * @route  POST /api/auth/reauth   |   POST /api/member-auth/reauth
 * @access Private (user or member)
 *
 * Status codes are chosen so a wrong credential does NOT look like an expired
 * session: 422 (not 401) on a bad factor, so the client's 401 silent-refresh
 * interceptor never hijacks it and log the user out — the re-auth modal shows
 * the message instead.
 */
const reauth = async (req, res) => {
  try {
    const ref = principalRef(req);
    if (!ref) return res.status(401).json({ message: 'Not authorized' });

    const { password, code } = req.body || {};

    // `+password` for the bcrypt compare; `twoFactorSecret` is select:true.
    const doc = await ref.Model.findById(ref.id).select('+password');
    if (!doc) return res.status(404).json({ message: 'Account not found' });

    // A passwordless (Google-only) account with no 2FA has no factor to prove.
    if (!doc.isTwoFactorEnabled && !doc.password) {
      return res.status(400).json({
        message:
          'Set an account password or enable 2FA to authorize sensitive actions.',
        code: 'STEP_UP_UNAVAILABLE',
      });
    }

    if (doc.isTwoFactorEnabled) {
      if (!code) {
        return res
          .status(400)
          .json({ message: 'Authentication code is required.' });
      }
      const valid = authenticator.verify({
        token: String(code).trim(),
        secret: doc.twoFactorSecret,
      });
      if (!valid) {
        return res.status(422).json({ message: 'Invalid authentication code.' });
      }
    } else {
      if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
      }
      const ok = await doc.matchPassword(password);
      if (!ok) {
        return res.status(422).json({ message: 'Incorrect password.' });
      }
    }

    const token = jwt.sign(
      { id: ref.id.toString(), type: 'step_up' },
      process.env.JWT_SECRET,
      { expiresIn: STEP_UP_TTL },
    );

    // Audit the elevation (best-effort — never fail the re-auth on a log error).
    await logActivity({
      userId: ref.id,
      action: 'step_up_reauth',
      category: 'auth',
      details: `Step-up re-authentication via ${doc.isTwoFactorEnabled ? '2FA' : 'password'}`,
      req,
    }).catch(() => {});

    res.json({ token, expiresIn: STEP_UP_TTL_SECONDS });
  } catch (error) {
    console.error('Step-up reauth error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { reauth };
