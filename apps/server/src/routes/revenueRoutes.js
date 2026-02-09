const express = require('express');
const router = express.Router();
const {
  getRevenueOverview,
  getRevenueByPlan,
  getSubscriptionMetrics,
  getRevenueHistory,
  getPaymentHistory,
} = require('../controllers/revenueController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');

// All routes require super admin authentication
router.use(protect);
router.use(superAdminProtect);

router.get('/overview', getRevenueOverview);
router.get('/by-plan', getRevenueByPlan);
router.get('/metrics', getSubscriptionMetrics);
router.get('/history', getRevenueHistory);
router.get('/payments', getPaymentHistory);

module.exports = router;
