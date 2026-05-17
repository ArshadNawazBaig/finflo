const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const {
  listTiers,
  updateTier,
  assignMemberTier,
  getPortalLimits,
  getPortalTierCatalog,
  upgradePortalTier,
} = require('../controllers/transferLimitTierController');

// Member-facing.
router.get('/portal/my-limits', protectMember, getPortalLimits);
router.get('/portal/available', protectMember, getPortalTierCatalog);
router.post('/portal/upgrade', protectMember, upgradePortalTier);

// Admin.
router.get('/', protect, admin, listTiers);
router.put('/:id', protect, admin, updateTier);
router.put('/assign/:memberId', protect, admin, assignMemberTier);

module.exports = router;
