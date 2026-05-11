const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { requireTransactionPin } = require('../middleware/transactionPinMiddleware');
const {
  createTermDeposit,
  getTermDeposits,
  breakTermDeposit,
  matureTermDeposit,
  getPortalTermDeposits,
  createPortalTermDeposit,
  breakPortalTermDeposit,
} = require('../controllers/termDepositController');

// Member portal specific routes
router.get('/portal/my-deposits', protectMember, getPortalTermDeposits);
router.post('/portal/create', protectMember, requireTransactionPin, createPortalTermDeposit);
router.post('/portal/:id/break', protectMember, requireTransactionPin, breakPortalTermDeposit);

router.post('/', protect, admin, createTermDeposit);
router.get('/:memberId', protect, getTermDeposits);
router.post('/:id/break', protect, admin, breakTermDeposit);
router.post('/:id/mature', protect, admin, matureTermDeposit);

module.exports = router;

