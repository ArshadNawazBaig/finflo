const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/userUploadMiddleware');
const {
  registerValidation,
  loginValidation,
} = require('../middleware/validationMiddleware');

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
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

module.exports = router;
