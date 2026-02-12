const User = require('../models/User');
const { logActivity } = require('./activityLogController');

// Create Staff Member
const createStaff = async (req, res) => {
  const { name, email, password, branchId } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const staff = await User.create({
      name,
      email,
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

    const query = { ownerId: req.user._id };
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

    res.json({
      data: staffMembers,
      totalEntries,
      totalPages: Math.ceil(totalEntries / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle Staff Status
const toggleStaffStatus = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff || staff.ownerId.toString() !== req.user._id.toString()) {
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
    if (!staff || staff.ownerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (name) staff.name = name;
    if (email) staff.email = email;
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
    if (!staff || staff.ownerId.toString() !== req.user._id.toString()) {
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

module.exports = {
  createStaff,
  getStaff,
  toggleStaffStatus,
  updateStaff,
  deleteStaff,
};
