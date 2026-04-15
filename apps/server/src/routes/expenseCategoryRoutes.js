const express = require('express');
const router = express.Router();
const {
  getExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory
} = require('../controllers/expenseCategoryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getExpenseCategories);
router.post('/', protect, createExpenseCategory);
router.delete('/:id', protect, deleteExpenseCategory);

module.exports = router;
