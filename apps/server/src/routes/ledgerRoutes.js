const express = require('express');
const router = express.Router();
const {
  getLedger,
  exportLedgerExcel,
  reverseTransaction,
} = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

router.route('/export').get(protect, exportLedgerExcel);
router.route('/:id/reverse').post(protect, reverseTransaction);
router.route('/').get(protect, getLedger);

module.exports = router;
