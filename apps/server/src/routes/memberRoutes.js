const express = require('express');
const router = express.Router();
const {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberInvestments,
  addInvestment,
  withdrawInvestment,
  getMemberProfits,
  distributeProfit,
  convertCustomerToMember,
  getMemberActivity,
  transferFunds,
  adminTransferFunds,
  lookupMember,
  recalculateBalance,
  getAllDistributions,
  // Business Share
  getMemberShares,
  addShareInvestment,
  withdrawShareInvestment,
  distributeShareProfit,
  getPortalShares,
  selfRegister,
  updateApprovalStatus,
  initiateRaastDeposit,
} = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const { memberValidation } = require('../middleware/validationMiddleware');

// Public routes
router.post('/self-register', memberValidation, selfRegister);

// Member Portal Specific Routes (Self-access) - Defined BEFORE global staff protection
router.get('/portal/activity', protectMember, getMemberActivity);
router.get('/portal/shares', protectMember, getPortalShares);
router.post('/portal/transfer', protectMember, transferFunds);
router.post('/portal/raast-deposit', protectMember, initiateRaastDeposit);
router.get('/portal/lookup', protectMember, lookupMember); // Member can lookup peers
router.get('/lookup', protect, lookupMember); // Admin can lookup members

// All subsequent routes require staff/admin authentication
router.use(protect);

// Member CRUD (Admin/Staff only)
router.get('/', getMembers);
router.put('/:id/approval', updateApprovalStatus);
router.get('/distributions', getAllDistributions); // Move above :id
router.get('/:id', getMemberById);
router.post('/', memberValidation, createMember);
router.post('/convert', convertCustomerToMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);
router.post('/admin/transfer', adminTransferFunds);
router.post('/recalculate-balance', recalculateBalance); // Fix stale balances

// Investment management (main balance — auto loan deduction applies on deposit)
router.get('/:id/investments', getMemberInvestments);
router.post('/:id/invest', addInvestment);
router.post('/:id/withdraw', withdrawInvestment);

// Profit management
router.get('/:id/profits', getMemberProfits);
router.post('/distribute-profit', distributeProfit);

// Business Share management (separate from main balance — no auto loan deduction)
router.get('/:id/shares', getMemberShares);
router.post('/:id/share-invest', addShareInvestment);
router.post('/:id/share-withdraw', withdrawShareInvestment);
router.post('/distribute-share-profit', distributeShareProfit);

module.exports = router;
