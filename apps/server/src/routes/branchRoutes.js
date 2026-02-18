const express = require('express');
const router = express.Router();
const {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  getBranchFinancials,
  addBranchExpense,
} = require('../controllers/branchController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(protect, admin, createBranch).get(protect, getBranches);

router
  .route('/:id')
  .get(protect, getBranch)
  .put(protect, admin, updateBranch)
  .delete(protect, admin, deleteBranch);

router.get('/:id/financials', protect, admin, getBranchFinancials);
router.post('/:id/expenses', protect, admin, addBranchExpense);

module.exports = router;
