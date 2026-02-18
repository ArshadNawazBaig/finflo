const Branch = require('../models/Branch');
const User = require('../models/User');
const FinancialTransaction = require('../models/FinancialTransaction');
const { logActivity } = require('./activityLogController');

// @desc    Create a new branch
// @route   POST /api/branches
// @access  Private (Admin only — managers cannot create branches)
const createBranch = async (req, res) => {
  try {
    // Only actual admins can create branches, not managers
    if (req.user.role === 'staff') {
      return res
        .status(403)
        .json({ message: 'Not authorized to create branches' });
    }

    const { name, address, contactNumber, managerId, branding } = req.body;

    const branch = await Branch.create({
      name,
      address,
      contactNumber,
      manager: managerId || null,
      owner: req.user._id,
      branding: branding || {},
    });

    if (managerId) {
      await User.findByIdAndUpdate(managerId, { branchId: branch._id });
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_created',
      category: 'branch',
      details: `Created new branch: ${branch.name}`,
      metadata: { branchId: branch._id },
      req,
    });

    res.status(201).json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all branches (admin) or single branch (manager)
// @route   GET /api/branches
// @access  Private
const getBranches = async (req, res) => {
  try {
    // Manager: return only their assigned branch
    if (req.user.isManager && req.user.role === 'staff') {
      const branch = await Branch.findOne({ manager: req.user._id }).populate(
        'manager',
        'name email',
      );
      return res.json(branch ? [branch] : []);
    }

    // Admin: return all branches they own
    const branches = await Branch.find({ owner: req.user._id }).populate(
      'manager',
      'name email',
    );
    res.json(branches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get single branch
// @route   GET /api/branches/:id
// @access  Private
const getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate(
      'manager',
      'name email',
    );

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Manager can only view their own branch
    if (req.user.isManager && req.user.role === 'staff') {
      if (branch.manager?.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: 'Not authorized to view this branch' });
      }
    }

    res.json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update branch details and branding
// @route   PUT /api/branches/:id
// @access  Private (Admin or Branch Manager)
const updateBranch = async (req, res) => {
  try {
    const { name, address, contactNumber, managerId, branding, isActive } =
      req.body;

    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Authorization: Admin (owner) OR the branch's manager
    const isOwner = branch.owner.toString() === req.user._id.toString();
    const isBranchManager =
      req.user.isManager &&
      branch.manager?.toString() === req.user._id.toString();

    if (!isOwner && !isBranchManager) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Managers cannot: reassign manager, deactivate branch
    if (isBranchManager && !isOwner) {
      if (managerId !== undefined && managerId !== branch.manager?.toString()) {
        return res
          .status(403)
          .json({ message: 'Managers cannot reassign branch managers' });
      }
      if (isActive !== undefined && isActive !== branch.isActive) {
        return res
          .status(403)
          .json({ message: 'Managers cannot deactivate branches' });
      }
    }

    // If manager changed (admin only), update users
    if (
      isOwner &&
      managerId !== undefined &&
      branch.manager?.toString() !== managerId
    ) {
      if (branch.manager) {
        await User.findByIdAndUpdate(branch.manager, {
          $unset: { branchId: 1 },
        });
      }
      if (managerId) {
        await User.findByIdAndUpdate(managerId, { branchId: branch._id });
      }
    }

    branch.name = name || branch.name;
    branch.address = address || branch.address;
    branch.contactNumber = contactNumber || branch.contactNumber;
    if (isOwner) {
      branch.manager = managerId !== undefined ? managerId : branch.manager;
      branch.isActive = isActive !== undefined ? isActive : branch.isActive;
    }
    branch.branding = branding || branch.branding;

    await branch.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_updated',
      category: 'branch',
      details: `Updated branch details: ${branch.name}`,
      metadata: { branchId: branch._id },
      req,
    });

    res.json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private (Admin only — managers cannot delete branches)
const deleteBranch = async (req, res) => {
  try {
    // Only actual admins can delete branches, not managers
    if (req.user.isManager && req.user.role === 'staff') {
      return res
        .status(403)
        .json({ message: 'Managers cannot delete branches' });
    }

    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (branch.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Branch.findByIdAndDelete(req.params.id);

    await User.updateMany(
      { branchId: req.params.id },
      { $unset: { branchId: '' } },
    );

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_deleted',
      category: 'branch',
      details: `Deleted branch: ${branch.name}`,
      metadata: { branchId: req.params.id },
      req,
    });

    res.json({ message: 'Branch removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get branch financial activities (Expenses & Transactions)
// @route   GET /api/branches/:id/financials
// @access  Private (Admin or Branch Manager)
const getBranchFinancials = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const branchId = req.params.id;

    // Manager can only access their own branch financials
    if (req.user.isManager && req.user.role === 'staff') {
      if (req.user.managedBranchId?.toString() !== branchId) {
        return res
          .status(403)
          .json({ message: 'Not authorized to view this branch financials' });
      }
    }

    const query = { branchId };

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const financials = await FinancialTransaction.find(query)
      .sort({ date: -1 })
      .populate('customer', 'name');

    res.json(financials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add a branch expense
// @route   POST /api/branches/:id/expenses
// @access  Private (Admin or Branch Manager)
const addBranchExpense = async (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
    const branchId = req.params.id;

    // Manager can only add expenses to their own branch
    if (req.user.isManager && req.user.role === 'staff') {
      if (req.user.managedBranchId?.toString() !== branchId) {
        return res
          .status(403)
          .json({ message: 'Not authorized to add expenses to this branch' });
      }
    }

    const expense = await FinancialTransaction.create({
      user: req.user.effectiveOwnerId,
      branchId,
      type: 'expense',
      category: category || 'other',
      amount,
      description,
      date: date || new Date(),
    });

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_expense_added',
      category: 'branch',
      details: `Added ${category || 'other'} expense of ${amount} to branch: ${branchId}`,
      metadata: {
        branchId,
        amount,
        expenseId: expense._id,
      },
      req,
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  getBranchFinancials,
  addBranchExpense,
};
