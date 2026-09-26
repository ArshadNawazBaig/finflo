const router = require('express').Router();
const { protectPrincipal } = require('../middleware/protectPrincipal');
const { signUpload } = require('../services/directUploadService');
const { rateLimit } = require('express-rate-limit');

router.post('/sign', protectPrincipal, rateLimit({
  windowMs: 15 * 60 * 1000, limit: 100,
  keyGenerator: (req) => String(req.member?._id || req.user._id),
  standardHeaders: true, legacyHeaders: false,
}), signUpload);
module.exports = router;
