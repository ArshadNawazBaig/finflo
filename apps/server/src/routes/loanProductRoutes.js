const express = require('express');
const router = express.Router();
const {
  getLoanProducts,
  createLoanProduct,
  updateLoanProduct,
  deleteLoanProduct,
} = require('../controllers/loanProductController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getLoanProducts).post(admin, createLoanProduct);

router
  .route('/:id')
  .put(admin, updateLoanProduct)
  .delete(admin, deleteLoanProduct);

module.exports = router;
