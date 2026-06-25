const User = require('../models/User');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const { logActivity } = require('./activityLogController');
const { escapeRegExp } = require('../utils/stringUtils');

// Get dashboard statistics for super admin
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({
      role: 'admin',
    });
    const activeUsers = await User.countDocuments({
      role: 'admin',
      isActive: true,
    });
    const inactiveUsers = await User.countDocuments({
      role: 'admin',
      isActive: false,
    });

    const totalCustomers = await Customer.countDocuments();
    const totalLoans = await Loan.countDocuments();
    const activeLoans = await Loan.countDocuments({ status: 'active' });
    const totalMembers = await Member.countDocuments();

    // Get loans by status
    const loansByStatus = await Loan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$principalAmount' },
        },
      },
    ]);

    // Get users by plan
    const usersByPlan = await User.aggregate([
      { $match: { role: 'admin' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    // Calculate total revenue (based on plan prices)
    const planPrices = { Free: 0, Basic: 29, Pro: 49 };
    let monthlyRevenue = 0;
    usersByPlan.forEach(({ _id, count }) => {
      monthlyRevenue += (planPrices[_id] || 0) * count;
    });

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSignups = await User.countDocuments({
      role: 'admin',
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get recent users
    const recentUsers = await User.find({ role: 'admin' })
      .select('name email businessName businessLogo profilePicture plan createdAt isActive')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get time-series data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const signupTrend = await User.aggregate([
      {
        $match: {
          role: 'admin',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const loanTrend = await Loan.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$principalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalCustomers,
      totalLoans,
      activeLoans,
      totalMembers,
      loansByStatus,
      usersByPlan,
      monthlyRevenue,
      recentSignups,
      recentUsers,
      signupTrend,
      loanTrend,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};

// Get all users (businesses)
const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      plan,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { role: 'admin' };

    if (search) {
      const safeSearch = escapeRegExp(String(search));
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { businessName: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (plan) query.plan = plan;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Get customer and loan counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const customerCount = await Customer.countDocuments({ user: user._id });
        const loanCount = await Loan.countDocuments({ user: user._id });
        const activeLoanCount = await Loan.countDocuments({
          user: user._id,
          status: 'active',
        });

        return {
          ...user.toObject(),
          customerCount,
          loanCount,
          activeLoanCount,
        };
      }),
    );

    res.json({
      users: usersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Get user by ID with detailed stats
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const customerCount = await Customer.countDocuments({ user: user._id });
    const loanCount = await Loan.countDocuments({ user: user._id });
    const activeLoanCount = await Loan.countDocuments({
      user: user._id,
      status: 'active',
    });
    const memberCount = await Member.countDocuments({ user: user._id });

    // Get loan statistics
    const loanStats = await Loan.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$principalAmount' },
        },
      },
    ]);

    // Get recent customers
    const recentCustomers = await Customer.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent members
    const recentMembers = await Member.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent loans
    const recentLoans = await Loan.find({ user: user._id })
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      user,
      stats: {
        customerCount,
        loanCount,
        activeLoanCount,
        memberCount,
        loanStats,
      },
      recentCustomers,
      recentMembers,
      recentLoans,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const {
      name,
      businessName,
      plan,
      isActive,
      subscriptionStatus,
      durationMonths,
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldPlan = user.plan;
    const oldStatus = user.isActive;

    if (name) user.name = name;
    if (businessName !== undefined) user.businessName = businessName;
    if (plan) user.plan = plan;
    if (isActive !== undefined) user.isActive = isActive;
    if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;

    // Manual subscription management (no Stripe). The super admin grants a paid
    // plan for a fixed duration; we activate it and set its expiry. Downgrading
    // to Free clears the subscription. `durationMonths` is only honoured for
    // paid plans, so unrelated profile edits don't reset an active expiry.
    const months = parseInt(durationMonths, 10);
    let newExpiry = null;
    if (user.plan === 'Free') {
      user.nextBillingDate = undefined;
      user.subscriptionStatus = 'active';
    } else if (Number.isInteger(months) && months > 0 && months <= 60) {
      newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + months);
      user.nextBillingDate = newExpiry;
      user.subscriptionStatus = 'active';
    }

    await user.save();

    // Log activity
    let activityDetails = `Admin updated user: ${user.email}`;
    if (plan && plan !== oldPlan) {
      activityDetails += ` (Plan: ${oldPlan} → ${plan})`;
    }
    if (newExpiry) {
      activityDetails += ` (Subscription activated for ${months} month(s), expires ${newExpiry.toLocaleDateString()})`;
    }
    if (isActive !== undefined && isActive !== oldStatus) {
      activityDetails += ` (Status: ${oldStatus ? 'Active' : 'Inactive'} → ${isActive ? 'Active' : 'Inactive'})`;
    }

    await logActivity({
      userId: req.user._id,
      action: 'user_updated_by_admin',
      category: 'admin',
      details: activityDetails,
      metadata: { targetUserId: user._id, changes: req.body },
      req,
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// Delete/Deactivate user
const deleteUser = async (req, res) => {
  try {
    const { permanent } = req.query;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot delete super admin' });
    }

    if (permanent === 'true') {
      // Permanent delete - also delete all associated data
      await Customer.deleteMany({ user: user._id });
      await Loan.deleteMany({ user: user._id });
      await Member.deleteMany({ user: user._id });
      await User.findByIdAndDelete(req.params.id);

      // Log activity
      await logActivity({
        userId: req.user._id,
        action: 'user_deleted_permanently',
        category: 'admin',
        details: `Admin permanently deleted user: ${user.email}`,
        metadata: { deletedUserId: user._id },
        req,
      });

      res.json({ message: 'User and all associated data permanently deleted' });
    } else {
      // Soft delete - just deactivate
      user.isActive = false;
      await user.save();

      // Log activity
      await logActivity({
        userId: req.user._id,
        action: 'user_deactivated_by_admin',
        category: 'admin',
        details: `Admin deactivated user: ${user.email}`,
        metadata: { targetUserId: user._id },
        req,
      });

      res.json({ message: 'User deactivated successfully' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Get system analytics
const getSystemAnalytics = async (req, res) => {
  try {
    // User growth over last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await User.aggregate([
      {
        $match: {
          role: 'admin',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Loan volume over last 6 months
    const loanVolume = await Loan.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$principalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Plan distribution
    const planDistribution = await User.aggregate([
      { $match: { role: 'admin' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    // Top users by loan count
    const topUsersByLoans = await Loan.aggregate([
      {
        $group: {
          _id: '$user',
          loanCount: { $sum: 1 },
          totalAmount: { $sum: '$principalAmount' },
        },
      },
      { $sort: { loanCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          _id: 1,
          loanCount: 1,
          totalAmount: 1,
          name: '$userInfo.name',
          email: '$userInfo.email',
          businessName: '$userInfo.businessName',
          plan: '$userInfo.plan',
        },
      },
    ]);

    res.json({
      userGrowth,
      loanVolume,
      planDistribution,
      topUsersByLoans,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

// Create super admin (protected, should only be called via seed script or by existing super admin)
const createSuperAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const superAdmin = await User.create({
      name,
      email,
      password,
      role: 'super_admin',
      isActive: true,
    });

    res.status(201).json({
      message: 'Super Admin created successfully',
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    });
  } catch (error) {
    console.error('Error creating super admin:', error);
    res.status(500).json({ message: 'Failed to create super admin' });
  }
};

// ── Payroll feature gating ────────────────────────────────────────────────
// Toggle the payroll module for a tenant. Enabling for the first time seeds the
// default (Pakistan FBR) tax slabs so the engine has a sensible baseline; the
// tenant can override them later. The flag lives on the admin (owner) doc.
const togglePayroll = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled (boolean) is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'admin') {
      return res
        .status(400)
        .json({ message: 'Payroll can only be toggled for business (admin) accounts' });
    }

    user.payrollEnabled = enabled;

    if (enabled) {
      const { DEFAULT_PAYROLL_SETTINGS } = require('../services/payrollService');
      if (!user.payrollSettings) user.payrollSettings = {};
      if (
        !Array.isArray(user.payrollSettings.taxSlabs) ||
        user.payrollSettings.taxSlabs.length === 0
      ) {
        user.payrollSettings.taxSlabs = DEFAULT_PAYROLL_SETTINGS.taxSlabs;
      }
    }

    await user.save();

    await logActivity({
      userId: req.user._id,
      action: 'payroll_toggled_by_admin',
      category: 'admin',
      details: `Payroll ${enabled ? 'enabled' : 'disabled'} for ${user.email}`,
      metadata: { targetUserId: user._id, enabled },
      req,
    });

    res.json({
      message: `Payroll ${enabled ? 'enabled' : 'disabled'} for ${user.businessName || user.email}`,
      payrollEnabled: user.payrollEnabled,
    });
  } catch (error) {
    console.error('Error toggling payroll:', error);
    res.status(500).json({ message: 'Failed to toggle payroll' });
  }
};

// Aggregate payroll footprint across all tenants.
const getPayrollStats = async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    const PayrollRun = require('../models/PayrollRun');

    const [enabledTenants, totalEmployees, paidAgg] = await Promise.all([
      User.countDocuments({ role: 'admin', payrollEnabled: true }),
      Employee.countDocuments({ status: { $ne: 'terminated' } }),
      PayrollRun.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, runs: { $sum: 1 }, totalNet: { $sum: '$totalNet' } } },
      ]),
    ]);

    res.json({
      enabledTenants,
      totalEmployees,
      paidRuns: paidAgg[0]?.runs || 0,
      totalNetDisbursed: paidAgg[0]?.totalNet || 0,
    });
  } catch (error) {
    console.error('Error fetching payroll stats:', error);
    res.status(500).json({ message: 'Failed to fetch payroll stats' });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSystemAnalytics,
  createSuperAdmin,
  togglePayroll,
  getPayrollStats,
};
