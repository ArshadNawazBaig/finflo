const express = require('express');
const router = express.Router();
const {
  getLedger,
  exportLedgerExcel,
  reverseTransaction,
  setCashOpening,
  getCashSummary,
  saveDenominations,
} = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

router.route('/export').get(protect, exportLedgerExcel);
router.route('/cash-opening').post(protect, setCashOpening);
router.route('/cash-summary').get(protect, getCashSummary);
router.route('/cash-denominations').post(protect, saveDenominations);
router.route('/:id/reverse').post(protect, reverseTransaction);
router.route('/').get(protect, getLedger);

module.exports = router;
