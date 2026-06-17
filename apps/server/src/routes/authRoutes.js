const express = require('express');
const router = express.Router();
const {
  logoutUser,
  registerUser,
  loginUser,
  getMe,
  updateDetails,
  uploadProfilePicture,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationCode,
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
  uploadBusinessLogo,
  deleteBusinessLogo,
  uploadBusinessStamp,
  deleteBusinessStamp,
  uploadCeoSignature,
  deleteCeoSignature,
} = require('../controllers/authController');
const {
  refresh,
  getSessions,
  deleteSession,
  logoutAll,
} = require('../controllers/auth/authSession');
const { reauth } = require('../controllers/auth/stepUp');
const { protect } = require('../middleware/authMiddleware');
const { requireRecentAuth } = require('../middleware/stepUpMiddleware');
const upload = require('../middleware/userUploadMiddleware');
const {
  registerValidation,
  loginValidation,
} = require('../middleware/validationMiddleware');

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post('/google-login', googleLogin);
router.post('/google-register', googleRegister);
router.post('/logout', logoutUser);
// Revocable-session layer: silent refresh + device/session management.
router.post('/refresh', refresh);
router.post('/logout-all', protect, logoutAll);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, deleteSession);
router.post('/login/verify-2fa', verifyLogin2FA);
// Step-up re-authentication: mints a short-lived proof for high-risk actions.
router.post('/reauth', protect, reauth);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/me', protect, getMe);
router.put(
  '/updatedetails',
  protect,
  // Only challenge when the login email is actually changing (account-takeover
  // vector); benign profile edits (name, branding, colour) pass through.
  requireRecentAuth({
    when: (req) =>
      !!req.body?.email &&
      req.body.email.toLowerCase() !== req.user?.email?.toLowerCase(),
  }),
  updateDetails,
);
router.put(
  '/updateprofilepicture',
  protect,
  upload.single('profilePicture'),
  uploadProfilePicture,
);
router.put('/updatepassword', protect, updatePassword);
router.delete('/delete-profile-picture', protect, deleteProfilePicture);
router.put(
  '/updatebusinesslogo',
  protect,
  upload.single('businessLogo'),
  uploadBusinessLogo,
);
router.delete('/delete-business-logo', protect, deleteBusinessLogo);
router.put(
  '/updatebusinessstamp',
  protect,
  upload.single('businessStamp'),
  uploadBusinessStamp,
);
router.delete('/delete-business-stamp', protect, deleteBusinessStamp);
router.put(
  '/updateceosignature',
  protect,
  upload.single('ceoSignature'),
  uploadCeoSignature,
);
router.delete('/delete-ceo-signature', protect, deleteCeoSignature);
router.delete('/delete-account', protect, requireRecentAuth(), deleteAccount);

// 2FA Routes
router.post('/2fa/generate', protect, generate2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);

// Forced Password Change Routes
router.post(
  '/request-password-change-code',
  protect,
  requestPasswordChangeCode,
);
router.post('/force-change-password', protect, forceChangePassword);

// Onboarding Routes
router.get('/onboarding', protect, getOnboardingStatus);
router.put('/onboarding', protect, updateOnboardingStatus);

module.exports = router;
