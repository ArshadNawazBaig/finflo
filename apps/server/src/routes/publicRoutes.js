const express = require('express');
const router = express.Router();
const {
  getLandingStats,
  loanLookup,
} = require('../controllers/publicController');

router.get('/stats', getLandingStats);
router.post('/loan-lookup', loanLookup);

module.exports = router;
