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
  setAutoRolloverAdmin,
  setAutoRolloverPortal,
} = require('../controllers/termDepositController');

// Member portal specific routes
router.get('/portal/my-deposits', protectMember, getPortalTermDeposits);
router.post('/portal/create', protectMember, requireTransactionPin, createPortalTermDeposit);
router.post('/portal/:id/break', protectMember, requireTransactionPin, breakPortalTermDeposit);
router.patch('/portal/:id/auto-rollover', protectMember, setAutoRolloverPortal);

router.post('/', protect, admin, createTermDeposit);
router.get('/:memberId', protect, getTermDeposits);
router.post('/:id/break', protect, admin, breakTermDeposit);
router.post('/:id/mature', protect, admin, matureTermDeposit);
router.patch('/:id/auto-rollover', protect, admin, setAutoRolloverAdmin);

module.exports = router;

