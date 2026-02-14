const express = require('express');
const router = express.Router();
const {
  loginMember,
  getMe,
  updateDetails,
  updatePassword,
  deleteAccount,
} = require('../controllers/memberAuthController');
const { protectMember } = require('../middleware/memberAuthMiddleware');

router.post('/login', loginMember);
router.get('/me', protectMember, getMe);
router.put('/updatedetails', protectMember, updateDetails);
router.put('/updatepassword', protectMember, updatePassword);
router.delete('/deleteaccount', protectMember, deleteAccount);

module.exports = router;
