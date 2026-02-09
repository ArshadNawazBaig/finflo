const express = require('express');
const router = express.Router();
const { getReportStats } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getReportStats);

module.exports = router;
