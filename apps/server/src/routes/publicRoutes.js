const express = require('express');
const router = express.Router();
const { lookupLoans } = require('../controllers/publicController');

// Public route - no authentication required
router.post('/loan-lookup', lookupLoans);

module.exports = router;
