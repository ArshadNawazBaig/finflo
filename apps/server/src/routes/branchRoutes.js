const express = require('express');
const router = express.Router();
const {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  getBranchFinancials,
  getBranchAnalytics,
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
router.get('/:id/analytics', protect, admin, getBranchAnalytics);
router.post('/:id/expenses', protect, admin, addBranchExpense);

module.exports = router;
