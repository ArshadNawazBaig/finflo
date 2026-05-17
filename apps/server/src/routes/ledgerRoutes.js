const express = require('express');
const router = express.Router();
const {
  getLedger,
  exportLedgerExcel,
  reverseTransaction,
  setCashOpening,
  getCashSummary,
  getBusinessStatement,
  syncFeeIncome,
  closeDay,
  getDailyClose,
} = require('../controllers/ledgerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/export').get(protect, exportLedgerExcel);
router.route('/cash-opening').post(protect, setCashOpening);
router.route('/cash-summary').get(protect, getCashSummary);
router.route('/daily-close').post(protect, closeDay).get(protect, getDailyClose);
router.route('/business-statement').get(protect, getBusinessStatement);
router.route('/sync-fee-income').post(protect, admin, syncFeeIncome);
router.route('/:id/reverse').post(protect, reverseTransaction);
router.route('/').get(protect, getLedger);

module.exports = router;
