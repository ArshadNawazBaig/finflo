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
} = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Member CRUD
router.get('/', getMembers);
router.get('/:id', getMemberById);
router.post('/', createMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

// Investment management
router.get('/:id/investments', getMemberInvestments);
router.post('/:id/invest', addInvestment);
router.post('/:id/withdraw', withdrawInvestment);

// Profit management
router.get('/:id/profits', getMemberProfits);
router.post('/distribute-profit', distributeProfit);

module.exports = router;
