const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
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
router.post('/portal/create', protectMember, createPortalTermDeposit);
router.post('/portal/:id/break', protectMember, breakPortalTermDeposit);

router.post('/', protect, admin, createTermDeposit);
router.get('/:memberId', protect, getTermDeposits);
router.post('/:id/break', protect, admin, breakTermDeposit);
router.post('/:id/mature', protect, admin, matureTermDeposit);

module.exports = router;

