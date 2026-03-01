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

    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Branch Segregation: Staff/Managers only see their branch data
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
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

const excel = require('exceljs');

const exportLedgerExcel = async (req, res) => {
  try {
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

    const query = req.user.isSuperAdmin ? {} : { user: req.user.effectiveOwnerId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    if (type) query.type = type;
    if (category) query.category = category;

    if (search) {
      const { Customer, Member } = require('../models');
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

    const transactions = await FinancialTransaction.find(query)
      .populate('customer', 'name email')
      .populate('member', 'name email')
      .populate('loan', 'principal totalAmount status')
      .sort({ [sortBy]: sortOrder });

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount (PKR)', key: 'amount', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Entity (Customer/Member)', key: 'entity', width: 30 },
      { header: 'Reference ID', key: 'reference', width: 25 },
    ];

    // Add rows
    transactions.forEach((t) => {
      worksheet.addRow({
        date: new Date(t.date).toLocaleDateString(),
        type: t.type ? t.type.toUpperCase() : 'N/A',
        category: t.category || 'N/A',
        amount: t.amount || 0,
        description: t.description || 'N/A',
        entity: t.customer?.name || t.member?.name || 'N/A',
        reference: t.reference || 'N/A',
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=transactions.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Ledger Export Error:', error);
    res
      .status(500)
      .json({ message: 'Failed to export financial ledger to Excel' });
  }
};

module.exports = {
  getLedger,
  exportLedgerExcel,
};
