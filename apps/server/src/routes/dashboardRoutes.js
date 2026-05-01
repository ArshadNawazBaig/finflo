const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  downloadStatement,
  addBusinessCapital,
  getCapitalHistory,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/download-statement', protect, downloadStatement);
router.post('/capital', protect, addBusinessCapital);
router.get('/capital-history', protect, getCapitalHistory);

module.exports = router;
