const express = require('express');
const router = express.Router();
const {
  getLandingStats,
  loanLookup,
  submitLead,
} = require('../controllers/publicController');

router.get('/stats', getLandingStats);
router.post('/loan-lookup', loanLookup);
router.post('/contact', submitLead);

module.exports = router;
