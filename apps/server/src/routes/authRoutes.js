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
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/userUploadMiddleware');
const {
  registerValidation,
  loginValidation,
} = require('../middleware/validationMiddleware');

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post('/logout', logoutUser);
router.post('/login/verify-2fa', verifyLogin2FA);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put(
  '/updateprofilepicture',
  protect,
  upload.single('profilePicture'),
  uploadProfilePicture,
);
router.put('/updatepassword', protect, updatePassword);
router.delete('/delete-profile-picture', protect, deleteProfilePicture);
router.delete('/delete-account', protect, deleteAccount);

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

module.exports = router;
