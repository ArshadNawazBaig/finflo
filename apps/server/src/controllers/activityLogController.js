const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { escapeRegExp } = require('../utils/stringUtils');

// Helper function to log activity
const logActivity = async ({
  userId,
  action,
  category,
  details,
  metadata,
  req,
}) => {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
    const userAgent = req?.get('user-agent') || 'unknown';

    await ActivityLog.create({
      user: userId || null,
      branchId: req?.user?.branchId || null,
      action,
      category,
      details,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error - logging should not break the main flow
  }
};

// Get all activity logs (Super Admin)
const getAllActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sortBy = req.query.sortBy || 'newest';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Build query
    let query = {};

    // Branch Segregation: Staff/Managers only see their own branch logs
    if (req.user.role === 'staff') {
      if (req.user.isManager && req.user.managedBranchId) {
        // Managers see all logs from their managed branch
        query.branchId = req.user.managedBranchId;
      } else if (req.user.branchId) {
        // Regular staff see their own branch logs
        query.branchId = req.user.branchId;
      }
    }

    // Filter by effectiveOwnerId for regular admins
    if (req.user.role === 'admin') {
      // Find all user IDs belonging to this admin (self + staff)
      const team = await User.find({
        $or: [{ _id: req.user._id }, { ownerId: req.user._id }],
      }).select('_id');
      const teamIds = team.map((t) => t._id);
      query.user = { $in: teamIds };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search logic
    if (search) {
      const escapedSearch = escapeRegExp(search);
      const searchRegex = new RegExp(escapedSearch, 'i');

      // Get user IDs matching search
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { action: searchRegex },
        { details: searchRegex },
        { user: { $in: userIds } },
      ];
    }

    // Sort logic
    let sort = {};
    if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    } else {
      sort = { createdAt: -1 }; // newest (default)
    }

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate('user', 'name email businessName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get activity logs for specific user (Super Admin)
const getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await ActivityLog.countDocuments({ user: userId });
    const logs = await ActivityLog.find({ user: userId })
      .populate('user', 'name email businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  logActivity,
  getAllActivityLogs,
  getUserActivityLogs,
};
