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

    // Robust branchId extraction
    const branchId =
      req?.user?.branchId ||
      req?.member?.branchId ||
      metadata?.branchId ||
      req?.user?.managedBranchId || // Added as a fallback for managers
      null;

    await ActivityLog.create({
      user: userId || null,
      branchId,
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

    // Branch Segregation & Role-based Filtering
    if (req.user.role === 'staff') {
      // Staff/Managers only see their branch's activity
      const effectiveBranchId = req.user.managedBranchId || req.user.branchId;
      if (effectiveBranchId) {
        query.branchId = effectiveBranchId;
      }
    } else if (req.user.role === 'admin') {
      // Admins (Owners) see all activity for their business branches
      const Branch = require('../models/Branch');
      const myBranches = await Branch.find({ owner: req.user._id }).select(
        '_id',
      );
      const branchIds = myBranches.map((b) => b._id);

      // Also include actions done by them/their staff that might not have a branchId
      const team = await User.find({
        $or: [{ _id: req.user._id }, { ownerId: req.user._id }],
      }).select('_id');
      const teamIds = team.map((t) => t._id);

      query.$or = [
        { branchId: { $in: branchIds } },
        { user: { $in: teamIds } },
      ];
    }
    // super_admin sees everything (query stays empty)

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
      .populate('user', 'name email businessName businessLogo profilePicture')
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
      .populate('user', 'name email businessName businessLogo profilePicture')
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
