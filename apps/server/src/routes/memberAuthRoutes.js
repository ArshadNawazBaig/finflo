const express = require('express');
const router = express.Router();
const { loginMember, getMe } = require('../controllers/memberAuthController');
const { protectMember } = require('../middleware/memberAuthMiddleware');

router.post('/login', loginMember);
router.get('/me', protectMember, getMe);

module.exports = router;
