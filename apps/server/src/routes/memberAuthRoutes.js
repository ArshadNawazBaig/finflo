const express = require('express');
const router = express.Router();
const {
  loginMember,
  getMe,
  updateDetails,
  uploadProfilePicture,
  updatePassword,
  deleteAccount,
} = require('../controllers/memberAuthController');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const upload = require('../middleware/userUploadMiddleware');

router.post('/login', loginMember);
router.get('/me', protectMember, getMe);
router.put('/updatedetails', protectMember, updateDetails);
router.put(
  '/updateprofilepicture',
  protectMember,
  upload.single('profilePicture'),
  uploadProfilePicture,
);
router.put('/updatepassword', protectMember, updatePassword);
router.delete('/deleteaccount', protectMember, deleteAccount);

module.exports = router;
