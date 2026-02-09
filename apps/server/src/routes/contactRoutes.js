const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');

// Public route - no authentication required
router.post('/', sendContactEmail);

module.exports = router;
