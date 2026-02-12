const Branch = require('../models/Branch');
const User = require('../models/User');

// @desc    Create a new branch
// @route   POST /api/branches
// @access  Private (Super Admin)
const createBranch = async (req, res) => {
  try {
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

    res.status(201).json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private (Super Admin)
const getBranches = async (req, res) => {
  try {
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

    // Check access rights if strict segregation is needed
    // For now, allow viewing if authenticated
    res.json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update branch details and branding
// @route   PUT /api/branches/:id
// @access  Private (Admin)
const updateBranch = async (req, res) => {
  try {
    const { name, address, contactNumber, managerId, branding, isActive } =
      req.body;

    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (branch.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // If manager changed, update users
    if (managerId && branch.manager?.toString() !== managerId) {
      // Remove branchId from old manager if needed (optional logic)
      // Add branchId to new manager
      await User.findByIdAndUpdate(managerId, { branchId: branch._id });
    }

    branch.name = name || branch.name;
    branch.address = address || branch.address;
    branch.contactNumber = contactNumber || branch.contactNumber;
    branch.manager = managerId || branch.manager;
    branch.branding = branding || branch.branding;
    branch.isActive = isActive !== undefined ? isActive : branch.isActive;

    await branch.save();
    res.json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private (Admin)
const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (branch.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Branch.findByIdAndDelete(req.params.id);

    // Also remove branchId from users associated with this branch
    await User.updateMany(
      { branchId: req.params.id },
      { $unset: { branchId: '' } },
    );

    res.json({ message: 'Branch removed' });
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
};
