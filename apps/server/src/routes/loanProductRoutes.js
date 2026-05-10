const express = require('express');
const router = express.Router();
const {
  getLoanProducts,
  createLoanProduct,
  updateLoanProduct,
  deleteLoanProduct,
  getMemberLoanProducts,
} = require('../controllers/loanProductController');
const { protect, admin } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');

// Member portal route (before admin protect)
router.get('/member', protectMember, getMemberLoanProducts);

router.use(protect);

router.route('/').get(getLoanProducts).post(admin, createLoanProduct);

router
  .route('/:id')
  .put(admin, updateLoanProduct)
  .delete(admin, deleteLoanProduct);

module.exports = router;
