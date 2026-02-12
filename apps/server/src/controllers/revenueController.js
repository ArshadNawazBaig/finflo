const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const Payment = require('../models/Payment');

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
      { $match: { role: 'admin', isActive: true } },
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

    // Calculate total revenue (Real data from Payment collection)
    const revenueAggregation = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue =
      revenueAggregation.length > 0 ? revenueAggregation[0].total : 0;

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
      { $match: { role: 'admin', isActive: true } },
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

    const history = [];
    let now = new Date();

    // Check if we have newer payments (in case server time is behind or data is future-dated)
    const latestPayment = await Payment.findOne().sort({ date: -1 });
    if (latestPayment && latestPayment.date > now) {
      now = latestPayment.date;
    }

    // Fetch real payment data grouped by month

    // Fetch real payment data grouped by month
    const startOfPeriod = new Date(
      now.getFullYear(),
      now.getMonth() - parseInt(months) + 1,
      1,
    );

    const revenueByMonth = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          date: { $gte: startOfPeriod },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Create a map for easy lookup
    const revenueMap = {};
    revenueByMonth.forEach((item) => {
      revenueMap[item._id] = item.revenue;
    });

    // We still want user counts for history, so keep the User aggregation or estimate it
    // For simplicity and performance, we'll iterate months as before but pull revenue from Map
    // and recalculate users (or keep the user logic as is for user count history)

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      // Use UTC construction to avoid timezone shifts (e.g. Feb 1 00:00 Local -> Jan 31 UTC)
      const monthDate = new Date(
        Date.UTC(now.getFullYear(), now.getMonth() - i, 1),
      );
      const nextMonth = new Date(
        Date.UTC(now.getFullYear(), now.getMonth() - i + 1, 1),
      );
      const monthKey = monthDate.toISOString().slice(0, 7);

      const usersInMonth = await User.countDocuments({
        role: { $ne: 'super_admin' },
        createdAt: { $lt: nextMonth },
        $or: [{ isActive: true }, { updatedAt: { $gte: monthDate } }],
      });

      history.push({
        month: monthKey,
        revenue: revenueMap[monthKey] || 0,
        users: usersInMonth,
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

    let query = { status: 'succeeded' };

    // If search is provided, we need to find matching users first
    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      query.user = { $in: matchingUsers.map((u) => u._id) };
    }

    const total = await Payment.countDocuments(query);
    const paymentRecords = await Payment.find(query)
      .populate('user', 'name email businessName plan')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const payments = paymentRecords.map((record) => ({
      _id: record._id,
      user: record.user
        ? {
            name: record.user.name,
            email: record.user.email,
            businessName: record.user.businessName,
          }
        : { name: 'Deleted User', email: 'N/A', businessName: 'N/A' },
      plan: record.planName || record.user?.plan || 'N/A',
      amount: record.amount,
      date: record.date,
      status: record.status,
      invoiceId: record.stripeInvoiceId,
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
