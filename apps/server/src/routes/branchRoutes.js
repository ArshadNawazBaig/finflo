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
const upload = require('../middleware/branchUploadMiddleware');
const { branchValidation } = require('../middleware/validationMiddleware');

router
  .route('/')
  .post(protect, admin, upload.single('logo'), branchValidation, createBranch)
  .get(protect, getBranches);

router
  .route('/:id')
  .get(protect, getBranch)
  .put(protect, admin, upload.single('logo'), updateBranch)
  .delete(protect, admin, deleteBranch);

router.get('/:id/financials', protect, getBranchFinancials);
router.get('/:id/analytics', protect, getBranchAnalytics);
router.post('/:id/expenses', protect, addBranchExpense);

module.exports = router;
