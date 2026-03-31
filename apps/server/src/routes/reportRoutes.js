const express = require('express');
const router = express.Router();
const {
  getReportStats,
  generateIFRS9Report,
  generateBasel3Report,
  getTrialBalance,
  getProfitAndLoss,
  getBranchSummary,
  getBalanceSheet,
  saveRegulatorySnapshot,
  getRegulatorySavedSnapshots,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getReportStats);
router.get('/ifrs9', protect, generateIFRS9Report);
router.get('/basel3', protect, generateBasel3Report);
router.get('/trial-balance', protect, getTrialBalance);
router.get('/profit-loss', protect, getProfitAndLoss);
router.get('/branch-summary', protect, getBranchSummary);
router.get('/balance-sheet', protect, getBalanceSheet);

router
  .route('/snapshots')
  .get(protect, getRegulatorySavedSnapshots)
  .post(protect, saveRegulatorySnapshot);

module.exports = router;
