const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createTermDeposit,
  getTermDeposits,
  breakTermDeposit,
  matureTermDeposit,
} = require('../controllers/termDepositController');

router.post('/', protect, admin, createTermDeposit);
router.get('/:memberId', protect, getTermDeposits);
router.post('/:id/break', protect, admin, breakTermDeposit);
router.post('/:id/mature', protect, admin, matureTermDeposit);

module.exports = router;
