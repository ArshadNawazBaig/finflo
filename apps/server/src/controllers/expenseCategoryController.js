const ExpenseCategory = require('../models/ExpenseCategory');

// @desc    Get all expense categories
// @route   GET /api/expense-categories
// @access  Private
const getExpenseCategories = async (req, res) => {
  try {
    const defaultSystemCategories = [
      'rent',
      'salary',
      'utilities',
      'marketing',
      'maintenance',
      'other',
    ];

    // Count system categories
    const systemCount = await ExpenseCategory.countDocuments({ isSystem: true });
    
    if (systemCount === 0) {
      await ExpenseCategory.insertMany(
        defaultSystemCategories.map((name) => ({
          name,
          isSystem: true,
        })),
      );
    }

    // Get system categories + categories created by the effective owner
    const categories = await ExpenseCategory.find({
      $or: [{ isSystem: true }, { user: req.user.effectiveOwnerId }],
    }).sort({ isSystem: -1, name: 1 });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create an expense category
// @route   POST /api/expense-categories
// @access  Private
const createExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if it already exists (case-insensitive check for this user)
    const existing = await ExpenseCategory.findOne({
      user: req.user.effectiveOwnerId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    // Check system categories too
    const systemExisting = await ExpenseCategory.findOne({
      isSystem: true,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (systemExisting) {
      return res.status(400).json({ message: 'Category already exists as a system category' });
    }

    const category = await ExpenseCategory.create({
      name: name.toLowerCase(), // Store in lowercase for consistency
      user: req.user.effectiveOwnerId,
      isSystem: false
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an expense category
// @route   DELETE /api/expense-categories/:id
// @access  Private
const deleteExpenseCategory = async (req, res) => {
  try {
    const category = await ExpenseCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Only allow deletion of user-created categories by the owner
    if (category.isSystem) {
      return res.status(400).json({ message: 'System categories cannot be deleted' });
    }

    if (category.user.toString() !== req.user.effectiveOwnerId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this category' });
    }

    await ExpenseCategory.findByIdAndDelete(req.params.id);

    res.json({ message: 'Category removed' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory
};
