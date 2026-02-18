const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  downloadStatement,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/download-statement', protect, downloadStatement);

module.exports = router;
