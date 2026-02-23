const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const Member = require('../models/Member');

// @desc    Get all financial transactions (Unified Ledger)
// @route   GET /api/ledger
// @access  Private
const getLedger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      search,
      startDate,
      endDate,
      type,
      category,
      sortBy = 'date',
      sortOrder: sortOrderQuery,
    } = req.query;
    const sortOrder = sortOrderQuery === 'asc' ? 1 : -1;

    const query = { user: req.user.effectiveOwnerId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Branch Segregation
    if (req.user.role === 'staff' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    if (type) query.type = type;
    if (category) query.category = category;

    // Search logic (complex because of customer/member names)
    if (search) {
      const [matchingCustomers, matchingMembers] = await Promise.all([
        Customer.find({
          user: req.user.effectiveOwnerId,
          name: { $regex: search, $options: 'i' },
        }).select('_id'),
        Member.find({
          user: req.user.effectiveOwnerId,
          name: { $regex: search, $options: 'i' },
        }).select('_id'),
      ]);

      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { customer: { $in: matchingCustomers.map((c) => c._id) } },
        { member: { $in: matchingMembers.map((m) => m._id) } },
      ];
    }

    const totalEntries = await FinancialTransaction.countDocuments(query);
    const transactions = await FinancialTransaction.find(query)
      .populate('customer', 'name email')
      .populate('member', 'name email')
      .populate('loan', 'principal totalAmount Status')
      .populate('referenceId', 'name')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    // Calculate full summary ignoring pagination but respecting search/date filters
    const allMatching =
      await FinancialTransaction.find(query).select('type amount');
    const summary = {
      totalIncome: allMatching
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpense: allMatching
        .filter((t) => t.type === 'expense' || t.type === 'loan')
        .reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: totalEntries,
    };

    res.json({
      data: transactions,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
      summary,
    });
  } catch (error) {
    console.error('Ledger Error:', error);
    res.status(500).json({ message: 'Failed to fetch financial ledger' });
  }
};

module.exports = {
  getLedger,
};
