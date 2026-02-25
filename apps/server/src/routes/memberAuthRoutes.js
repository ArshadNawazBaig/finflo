const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/memberAuthController');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const upload = require('../middleware/userUploadMiddleware');

router.post('/login', loginMember);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/me', protectMember, getMe);
router.put('/updatedetails', protectMember, updateDetails);
router.put(
  '/updateprofilepicture',
  protectMember,
  upload.single('profilePicture'),
  uploadProfilePicture,
);
router.put('/updatepassword', protectMember, updatePassword);
router.delete('/deleteprofilepicture', protectMember, deleteProfilePicture);
router.delete('/deleteaccount', protectMember, deleteAccount);

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

module.exports = router;
