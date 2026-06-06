const express = require('express');
const router = express.Router();
const { protect, authorizePermissions } = require('../middleware/authMiddleware');
const { getCashFlowForecast } = require('../controllers/cashFlowForecastController');

router.get(
  '/',
  protect,
  authorizePermissions('view_reports'),
  getCashFlowForecast,
);

module.exports = router;
