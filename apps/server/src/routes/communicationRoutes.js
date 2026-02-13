const express = require('express');
const router = express.Router();
const { triggerScan } = require('../controllers/communicationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/trigger-scan', protect, admin, triggerScan);

module.exports = router;
