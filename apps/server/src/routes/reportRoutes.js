const express = require('express');
const router = express.Router();
const {
  getReportStats,
  generateIFRS9Report,
  generateBasel3Report,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getReportStats);
router.get('/ifrs9', protect, generateIFRS9Report);
router.get('/basel3', protect, generateBasel3Report);

module.exports = router;
