const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('./activityLogController');

// Create Staff Member
const createStaff = async (req, res) => {
  const { name, email, password, branchId } = req.body;
  const lowercaseEmail = email?.toLowerCase();
  const lowercaseName = name?.toLowerCase();

  try {
    const userExists = await User.findOne({ email: lowercaseEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const staff = await User.create({
      name: lowercaseName,
      email: lowercaseEmail,
      password,
      role: 'staff',
      ownerId: req.user._id, // Linked to the Admin who created them
      branchId: branchId || null,
      businessName: req.user.businessName, // Inherit business name
      securityCode: req.user.securityCode, // Shared security code
    });

    await logActivity({
      userId: req.user._id,
      action: 'staff_created',
      category: 'user',
      details: `Admin created staff account: ${email}`,
      req,
    });

    res.status(201).json({
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      branchId: staff.branchId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Staff (Paginated & Searchable)
const getStaff = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { ownerId: req.user._id };

    // Branch Restricted Admin logic
    if (req.user.isManager && req.user.role === 'staff') {
      query = { ownerId: req.user.ownerId, branchId: req.user.branchId };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const totalEntries = await User.countDocuments(query);
    const staffMembers = await User.find(query)
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate Summary (Ignoring pagination but respecting filters)
    const [summaryResult] = await User.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          admins: {
            $sum: {
              $cond: [{ $in: ['$role', ['admin', 'super_admin']] }, 1, 0],
            },
          },
        },
      },
    ]);

    const summary = summaryResult || { total: 0, active: 0, admins: 0 };

    res.json({
      data: staffMembers,
      totalEntries,
      totalPages: Math.ceil(totalEntries / parseInt(limit)),
      currentPage: parseInt(page),
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle Staff Status
const toggleStaffStatus = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);

    // Authorization check: Must be owner OR the staff's branch manager
    const isOwner =
      staff && staff.ownerId.toString() === req.user._id.toString();
    const isBranchManager =
      req.user.isManager &&
      staff &&
      staff.ownerId.toString() === req.user.ownerId.toString() &&
      staff.branchId?.toString() === req.user.branchId?.toString();

    if (!staff || (!isOwner && !isBranchManager)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    await logActivity({
      userId: req.user._id,
      action: 'staff_status_toggled',
      category: 'user',
      details: `Admin toggled status for ${staff.email} to ${staff.isActive}`,
      req,
    });

    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Staff Member
const updateStaff = async (req, res) => {
  const { name, email, password, branchId } = req.body;
  try {
    const staff = await User.findById(req.params.id);

    // Authorization check: Must be owner OR the staff's branch manager
    const isOwner =
      staff && staff.ownerId.toString() === req.user._id.toString();
    const isBranchManager =
      req.user.isManager &&
      staff &&
      staff.ownerId.toString() === req.user.ownerId.toString() &&
      staff.branchId?.toString() === req.user.branchId?.toString();

    if (!staff || (!isOwner && !isBranchManager)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (name) staff.name = name.toLowerCase();
    if (email) staff.email = email.toLowerCase();
    if (password) staff.password = password;
    if (branchId !== undefined) staff.branchId = branchId;

    const updatedStaff = await staff.save();

    await logActivity({
      userId: req.user._id,
      action: 'staff_updated',
      category: 'user',
      details: `Admin updated staff account: ${staff.email}`,
      req,
    });

    res.json({
      _id: updatedStaff._id,
      name: updatedStaff.name,
      email: updatedStaff.email,
      role: updatedStaff.role,
      branchId: updatedStaff.branchId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Staff Member
const deleteStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);

    // Authorization check: Must be owner OR the staff's branch manager
    const isOwner =
      staff && staff.ownerId.toString() === req.user._id.toString();
    const isBranchManager =
      req.user.isManager &&
      staff &&
      staff.ownerId.toString() === req.user.ownerId.toString() &&
      staff.branchId?.toString() === req.user.branchId?.toString();

    if (!staff || (!isOwner && !isBranchManager)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: req.user._id,
      action: 'staff_deleted',
      category: 'user',
      details: `Admin deleted staff account: ${staff.email}`,
      req,
    });

    res.json({ message: 'Staff member removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single Staff Member by ID
const getStaffById = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id).populate(
      'branchId',
      'name',
    );

    // Authorization check: Must be owner OR the staff's branch manager
    const isOwner =
      staff &&
      staff.ownerId &&
      staff.ownerId.toString() === req.user._id.toString();
    const isBranchManager =
      req.user.isManager &&
      staff &&
      staff.ownerId &&
      staff.ownerId.toString() === req.user.ownerId.toString() &&
      staff.branchId?.toString() === req.user.branchId?.toString();

    if (!staff || (!isOwner && !isBranchManager)) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Pagination for activity logs
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalEntries = await ActivityLog.countDocuments({
      user: req.params.id,
    });

    // Fetch activity for this staff
    const recentActivity = await ActivityLog.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      staff,
      recentActivity,
      totalPages: Math.ceil(totalEntries / limit),
      totalEntries,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createStaff,
  getStaff,
  getStaffById,
  toggleStaffStatus,
  updateStaff,
  deleteStaff,
};
