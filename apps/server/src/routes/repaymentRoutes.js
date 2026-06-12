const express = require('express');
const router = express.Router();
const {
  addRepayment,
  getRepayments,
  memberRepayLoan,
  getMemberRepayments,
} = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { requireTransactionPin } = require('../middleware/transactionPinMiddleware');
const { idempotency } = require('../middleware/idempotency');

router
  .route('/')
  .get(protect, getRepayments)
  .post(protect, idempotency, addRepayment);
router.get('/my-repayments', protectMember, getMemberRepayments);
router.post(
  '/member/:id/repay',
  protectMember,
  idempotency,
  requireTransactionPin,
  memberRepayLoan,
);

module.exports = router;
