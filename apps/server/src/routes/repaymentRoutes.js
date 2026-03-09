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

router.route('/').get(protect, getRepayments).post(protect, addRepayment);
router.get('/my-repayments', protectMember, getMemberRepayments);
router.post('/member/:id/repay', protectMember, memberRepayLoan);

module.exports = router;
