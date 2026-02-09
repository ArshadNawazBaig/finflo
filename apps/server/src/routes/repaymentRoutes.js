const express = require('express');
const router = express.Router();
const {
  addRepayment,
  getRepayments,
} = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getRepayments).post(protect, addRepayment);

module.exports = router;
