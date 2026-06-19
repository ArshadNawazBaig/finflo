const express = require('express');
const router = express.Router();
const {
  logoutMember,
  loginMember,
  getMe,
  updateDetails,
  uploadProfilePicture,
  updatePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  deleteProfilePicture,
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
  updateNotificationPreferences,
} = require('../controllers/memberAuthController');
const {
  getSessions,
  deleteSession,
  logoutAll,
} = require('../controllers/auth/authSession');
const { reauth } = require('../controllers/auth/stepUp');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { requireRecentAuth } = require('../middleware/stepUpMiddleware');
const upload = require('../middleware/userUploadMiddleware');

router.post('/login', loginMember);
router.post('/google-login', googleLogin);
router.post('/google-register', googleRegister);
router.post('/logout', logoutMember);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/me', protectMember, getMe);
// Step-up re-authentication for portal members (mirrors POST /api/auth/reauth).
router.post('/reauth', protectMember, reauth);
router.put(
  '/updatedetails',
  protectMember,
  // Challenge only when the login email changes (account-takeover vector).
  requireRecentAuth({
    when: (req) =>
      !!req.body?.email &&
      req.body.email.toLowerCase() !== req.member?.email?.toLowerCase(),
  }),
  updateDetails,
);
router.put(
  '/updateprofilepicture',
  protectMember,
  upload.single('profilePicture'),
  uploadProfilePicture,
);
router.put('/updatepassword', protectMember, updatePassword);
router.delete('/deleteprofilepicture', protectMember, deleteProfilePicture);
router.delete('/deleteaccount', protectMember, requireRecentAuth(), deleteAccount);

// 2FA Routes
router.post('/2fa/generate', protectMember, generate2FA);
router.post('/2fa/verify', protectMember, verify2FA);
router.post('/2fa/disable', protectMember, disable2FA);
router.post('/2fa/verify-login', verifyLogin2FA);

// Forced Password Change Routes
router.post(
  '/request-password-change-code',
  protectMember,
  requestPasswordChangeCode,
);
router.post('/force-change-password', protectMember, forceChangePassword);

// Onboarding Routes
router.get('/onboarding', protectMember, getOnboardingStatus);
router.put('/onboarding', protectMember, updateOnboardingStatus);

// Notification Preferences
router.put('/notification-preferences', protectMember, updateNotificationPreferences);

// Active-session management (device list / revoke / log out everywhere). The
// shared, principal-agnostic handlers serve members under protectMember; the
// refresh endpoint itself is the shared POST /api/auth/refresh.
router.get('/sessions', protectMember, getSessions);
router.delete('/sessions/:id', protectMember, deleteSession);
router.post('/logout-all', protectMember, logoutAll);

module.exports = router;
