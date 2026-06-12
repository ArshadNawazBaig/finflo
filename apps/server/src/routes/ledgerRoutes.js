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
const {
  protect,
  admin,
  authorizePermissions,
} = require('../middleware/authMiddleware');
const {
  exportAccounting,
  exportEntities,
} = require('../controllers/accountingExportController');

router.route('/export').get(protect, exportLedgerExcel);
// Accounting-software-compatible CSV export (generic | quickbooks | xero | journal)
router.route('/accounting-export').get(protect, exportAccounting);
// Position/schedule exports (loans receivable, member balances, customers) —
// admin-gated because these listings carry member/customer PII.
router.route('/entity-export').get(protect, admin, exportEntities);
router.route('/cash-opening').post(protect, setCashOpening);
router.route('/cash-summary').get(protect, getCashSummary);
router.route('/daily-close').post(protect, closeDay).get(protect, getDailyClose);
router.route('/business-statement').get(protect, getBusinessStatement);
router.route('/sync-fee-income').post(protect, admin, syncFeeIncome);
// Reversing a posted transaction is a sensitive action. Gated behind the
// `reverse_transactions` permission so the Teller role (which can create
// transactions) can't undo them — only admins and the Accountant /
// Branch Manager templates carry this capability.
router
  .route('/:id/reverse')
  .post(protect, authorizePermissions('reverse_transactions'), reverseTransaction);
router.route('/').get(protect, getLedger);

module.exports = router;
