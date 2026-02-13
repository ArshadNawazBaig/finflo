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
} = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');
const { protectMember } = require('../middleware/memberAuthMiddleware');

// Member Portal Specific Routes (Self-access) - Defined BEFORE global staff protection
router.get('/portal/activity', protectMember, getMemberActivity);
router.post('/portal/transfer', protectMember, transferFunds);

// All subsequent routes require staff/admin authentication
router.use(protect);

// Member CRUD (Admin/Staff only)
router.get('/', getMembers);
router.get('/:id', getMemberById);
router.post('/', createMember);
router.post('/convert', convertCustomerToMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);
router.post('/admin/transfer', adminTransferFunds);

// Investment management
router.get('/:id/investments', getMemberInvestments);
router.post('/:id/invest', addInvestment);
router.post('/:id/withdraw', withdrawInvestment);

// Profit management
router.get('/:id/profits', getMemberProfits);
router.post('/distribute-profit', distributeProfit);

module.exports = router;
