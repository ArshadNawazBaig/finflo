const express = require('express');
const router = express.Router();
const { verifyCodeAndGetLoans } = require('../controllers/publicController');

// Public route - no authentication required
router.post('/loan-lookup', verifyCodeAndGetLoans);

module.exports = router;
