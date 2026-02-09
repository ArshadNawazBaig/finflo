const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

// Get revenue overview
const getRevenueOverview = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const planPrices = {};
    settings.subscriptionPlans.forEach((plan) => {
      planPrices[plan.name] = plan.price;
    });

    // Get user counts by plan
    const usersByPlan = await User.aggregate([
      { $match: { role: { $ne: 'super_admin' }, isActive: true } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0;
    usersByPlan.forEach(({ _id, count }) => {
      mrr += (planPrices[_id] || 0) * count;
    });

    // Get total active users
    const totalActiveUsers = await User.countDocuments({
      role: { $ne: 'super_admin' },
      isActive: true,
    });

    // Calculate ARPU (Average Revenue Per User)
    const arpu = totalActiveUsers > 0 ? mrr / totalActiveUsers : 0;

    // Get previous month MRR for growth calculation
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const previousMonthUsers = await User.aggregate([
      {
        $match: {
          role: { $ne: 'super_admin' },
          isActive: true,
          createdAt: { $lte: oneMonthAgo },
        },
      },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    let previousMrr = 0;
    previousMonthUsers.forEach(({ _id, count }) => {
      previousMrr += (planPrices[_id] || 0) * count;
    });

    // Calculate growth rate
    const growthRate =
      previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0;

    // Calculate total revenue (all-time estimated)
    const totalUsers = await User.countDocuments({
      role: { $ne: 'super_admin' },
    });
    const avgMonthsActive = 3; // Estimate average subscription duration
    const totalRevenue = mrr * avgMonthsActive;

    res.json({
      mrr,
      totalRevenue,
      growthRate,
      arpu,
      totalActiveUsers,
      previousMrr,
    });
  } catch (error) {
    console.error('Error fetching revenue overview:', error);
    res.status(500).json({ message: 'Failed to fetch revenue overview' });
  }
};

// Get revenue by plan
const getRevenueByPlan = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const planPrices = {};
    settings.subscriptionPlans.forEach((plan) => {
      planPrices[plan.name] = plan.price;
    });

    const usersByPlan = await User.aggregate([
      { $match: { role: { $ne: 'super_admin' }, isActive: true } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    const revenueByPlan = usersByPlan.map(({ _id, count }) => ({
      plan: _id,
      users: count,
      monthlyRevenue: (planPrices[_id] || 0) * count,
      price: planPrices[_id] || 0,
    }));

    res.json(revenueByPlan);
  } catch (error) {
    console.error('Error fetching revenue by plan:', error);
    res.status(500).json({ message: 'Failed to fetch revenue by plan' });
  }
};

// Get subscription metrics
const getSubscriptionMetrics = async (req, res) => {
  try {
    // Plan distribution
    const planDistribution = await User.aggregate([
      { $match: { role: { $ne: 'super_admin' } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    // Active vs inactive
    const activeCount = await User.countDocuments({
      role: { $ne: 'super_admin' },
      isActive: true,
    });
    const inactiveCount = await User.countDocuments({
      role: { $ne: 'super_admin' },
      isActive: false,
    });

    // Calculate churn rate (inactive / total)
    const totalUsers = activeCount + inactiveCount;
    const churnRate = totalUsers > 0 ? (inactiveCount / totalUsers) * 100 : 0;

    // New users this month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await User.countDocuments({
      role: { $ne: 'super_admin' },
      createdAt: { $gte: thisMonthStart },
    });

    res.json({
      planDistribution,
      activeCount,
      inactiveCount,
      churnRate,
      newUsersThisMonth,
      totalUsers,
    });
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    res.status(500).json({ message: 'Failed to fetch subscription metrics' });
  }
};

// Get revenue history (monthly)
const getRevenueHistory = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const settings = await SystemSettings.getSettings();
    const planPrices = {};
    settings.subscriptionPlans.forEach((plan) => {
      planPrices[plan.name] = plan.price;
    });

    const history = [];
    const now = new Date();

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const usersInMonth = await User.aggregate([
        {
          $match: {
            role: { $ne: 'super_admin' },
            createdAt: { $lt: nextMonth },
            $or: [{ isActive: true }, { updatedAt: { $gte: monthDate } }],
          },
        },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]);

      let monthRevenue = 0;
      usersInMonth.forEach(({ _id, count }) => {
        monthRevenue += (planPrices[_id] || 0) * count;
      });

      history.push({
        month: monthDate.toISOString().slice(0, 7), // YYYY-MM format
        revenue: monthRevenue,
        users: usersInMonth.reduce((sum, { count }) => sum + count, 0),
      });
    }

    res.json(history);
  } catch (error) {
    console.error('Error fetching revenue history:', error);
    res.status(500).json({ message: 'Failed to fetch revenue history' });
  }
};

// Get payment history (simulated based on user subscriptions)
const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const settings = await SystemSettings.getSettings();
    const planPrices = {};
    settings.subscriptionPlans.forEach((plan) => {
      planPrices[plan.name] = plan.price;
    });

    let query = { role: { $ne: 'super_admin' } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('name email businessName plan createdAt isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const payments = users.map((user) => ({
      _id: user._id,
      user: {
        name: user.name,
        email: user.email,
        businessName: user.businessName,
      },
      plan: user.plan,
      amount: planPrices[user.plan] || 0,
      date: user.createdAt,
      status: user.isActive ? 'active' : 'cancelled',
    }));

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
};

module.exports = {
  getRevenueOverview,
  getRevenueByPlan,
  getSubscriptionMetrics,
  getRevenueHistory,
  getPaymentHistory,
};
