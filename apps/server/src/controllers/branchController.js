const Branch = require('../models/Branch');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const { logActivity } = require('./activityLogController');
const {
  calculatePercentageChange,
  getMonthDates,
} = require('../utils/reportUtils');
const { canAddBranch } = require('../utils/planLimits');

// @desc    Create a new branch
// @route   POST /api/branches
// @access  Private (Admin only — managers cannot create branches)
const createBranch = async (req, res) => {
  try {
    // Only actual admins can create branches, not managers
    if (req.user.role === 'staff') {
      return res
        .status(403)
        .json({ message: 'Not authorized to create branches' });
    }

    // Check plan limits
    const owner = await User.findById(req.user._id).select('plan');
    const userPlan = owner.plan || 'Free';

    // Count existing branches for this owner
    const branchCount = await Branch.countDocuments({ owner: req.user._id });

    // Validate against plan limits
    const limitCheck = await canAddBranch(userPlan, branchCount);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        limit: limitCheck.limit,
        current: limitCheck.current,
        plan: userPlan,
        upgradeRequired: true,
      });
    }

    let { name, address, contactNumber, managerId, branding } = req.body;

    // Parse branding if it's a string (FormData sends it as string)
    if (typeof branding === 'string') {
      try {
        branding = JSON.parse(branding);
      } catch (e) {
        branding = {};
      }
    } else {
      branding = branding || {};
    }

    // Handle logo upload
    if (req.file) {
      branding.logoUrl = req.file.path;
    }

    const branch = await Branch.create({
      name,
      address,
      contactNumber,
      manager: managerId || null,
      owner: req.user._id,
      branding,
    });

    if (managerId) {
      // Store both branchId (member of) and managedBranchId (managed by) on the User
      // so the auth middleware can derive isManager without a DB query.
      await User.findByIdAndUpdate(managerId, {
        branchId: branch._id,
        managedBranchId: branch._id,
      });
      try {
        const Notification = require('../models/Notification');
        await new Notification({
          recipient: managerId,
          recipientModel: 'User',
          title: 'Branch Assignment',
          message: `You have been assigned as the manager for branch: ${name}`,
          type: 'info',
          link: `/branches/${branch._id}`, // Redirect to branch details
          action: 'branch_manager_assigned',
        }).save();
      } catch (err) {
        console.error('Failed to notify manager:', err);
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_created',
      category: 'branch',
      details: `Created new branch: ${branch.name}`,
      metadata: { branchId: branch._id },
      req,
    });

    res.status(201).json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all branches (admin) or single branch (manager)
// @route   GET /api/branches
// @access  Private
const getBranches = async (req, res) => {
  try {
    // Manager: return only their assigned branch
    if (req.user.isManager && req.user.role === 'staff') {
      const branch = await Branch.findOne({ manager: req.user._id }).populate(
        'manager',
        'name email',
      );
      return res.json(branch ? [branch] : []);
    }

    // Admin: return all branches they own
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

    // Manager can only view their own branch
    if (req.user.isManager && req.user.role === 'staff') {
      const branchManagerId =
        branch.manager?._id?.toString() || branch.manager?.toString();
      if (branchManagerId !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: 'Not authorized to view this branch' });
      }
    }

    res.json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update branch details and branding
// @route   PUT /api/branches/:id
// @access  Private (Admin or Branch Manager)
const updateBranch = async (req, res) => {
  try {
    const { name, address, contactNumber, managerId, branding, isActive } =
      req.body;

    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Authorization: Admin (owner) OR the branch's manager
    const isOwner = branch.owner.toString() === req.user._id.toString();
    const branchManagerId =
      branch.manager?._id?.toString() || branch.manager?.toString();
    const isBranchManager =
      req.user.isManager && branchManagerId === req.user._id.toString();

    if (!isOwner && !isBranchManager) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Managers cannot: reassign manager, deactivate branch
    if (isBranchManager && !isOwner) {
      if (managerId !== undefined && managerId !== branchManagerId) {
        return res
          .status(403)
          .json({ message: 'Managers cannot reassign branch managers' });
      }
      if (isActive !== undefined && isActive !== branch.isActive) {
        return res
          .status(403)
          .json({ message: 'Managers cannot deactivate branches' });
      }
    }

    // If manager changed (admin only), update users
    const currentManagerId = branch.manager?.toString();
    const newManagerId =
      managerId === 'none' || managerId === '' ? null : managerId || null;

    if (
      isOwner &&
      managerId !== undefined &&
      currentManagerId !== (newManagerId?.toString() || null)
    ) {
      // Remove branchId and managedBranchId from old manager if they existed
      if (currentManagerId) {
        await User.findByIdAndUpdate(currentManagerId, {
          $unset: { branchId: 1, managedBranchId: 1 },
        });
      }
      // Add branchId and managedBranchId to new manager if they exist
      if (newManagerId) {
        await User.findByIdAndUpdate(newManagerId, {
          branchId: branch._id,
          managedBranchId: branch._id,
        });
        try {
          const Notification = require('../models/Notification');
          await new Notification({
            recipient: newManagerId,
            recipientModel: 'User',
            title: 'Branch Assignment',
            message: `You have been assigned as the manager for branch: ${branch.name}`,
            type: 'info',
            link: `/branches/${branch._id}`,
            action: 'branch_manager_assigned',
          }).save();
        } catch (err) {
          console.error('Failed to notify manager:', err);
        }
      }
    }

    branch.name = name || branch.name;
    branch.address = address || branch.address;
    branch.contactNumber = contactNumber || branch.contactNumber;
    if (isOwner) {
      branch.manager = managerId !== undefined ? newManagerId : branch.manager;
      branch.isActive = isActive !== undefined ? isActive : branch.isActive;
    }

    // Parse branding if it's a string
    let parsedBranding = branding;
    if (typeof branding === 'string') {
      try {
        parsedBranding = JSON.parse(branding);
      } catch (e) {
        parsedBranding = branch.branding;
      }
    }

    if (parsedBranding) {
      branch.branding = {
        ...branch.branding.toObject(),
        ...parsedBranding,
      };
    }

    // Handle logo upload
    if (req.file) {
      branch.branding.logoUrl = req.file.path;
    }

    await branch.save();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_updated',
      category: 'branch',
      details: `Updated branch details: ${branch.name}`,
      metadata: { branchId: branch._id },
      req,
    });

    res.json(branch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete branch
// @route   DELETE /api/branches/:id
// @access  Private (Admin only — managers cannot delete branches)
const deleteBranch = async (req, res) => {
  try {
    // Only actual admins can delete branches, not managers
    if (req.user.isManager && req.user.role === 'staff') {
      return res
        .status(403)
        .json({ message: 'Managers cannot delete branches' });
    }

    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (branch.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Branch.findByIdAndDelete(req.params.id);

    await User.updateMany(
      { branchId: req.params.id },
      { $unset: { branchId: '' } },
    );

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_deleted',
      category: 'branch',
      details: `Deleted branch: ${branch.name}`,
      metadata: { branchId: req.params.id },
      req,
    });

    res.json({ message: 'Branch removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get branch financial activities (Expenses & Transactions)
// @route   GET /api/branches/:id/financials
// @access  Private (Admin or Branch Manager)
const getBranchFinancials = async (req, res) => {
  try {
    const { startDate, endDate, type, search, category } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const branchId = req.params.id;
    const mongoose = require('mongoose');
    let branchOid;
    try {
      branchOid = new mongoose.Types.ObjectId(branchId);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid Branch ID' });
    }

    // Manager can only access their own branch financials
    if (req.user.isManager && req.user.role === 'staff') {
      if (req.user.managedBranchId?.toString() !== branchId) {
        return res
          .status(403)
          .json({ message: 'Not authorized to view this branch financials' });
      }
    }

    // Get all customers and members associated with this branch to capture implicit records
    const [branchCustomers, branchMembers] = await Promise.all([
      Customer.find({
        $or: [{ branchId: branchOid }, { branchId: branchId }],
      }).select('_id'),
      Member.find({
        $or: [{ branchId: branchOid }, { branchId: branchId }],
      }).select('_id'),
    ]);

    const customerIds = branchCustomers.map((c) => c._id);
    const memberIds = branchMembers.map((m) => m._id);

    // Self-healing for this specific branch scope
    try {
      const orphans = await Loan.find({
        customer: { $in: customerIds },
        branchId: { $exists: false },
      });
      if (orphans.length > 0) {
        for (const loan of orphans) {
          await Loan.findByIdAndUpdate(loan._id, { branchId: branchOid });
          await Repayment.updateMany(
            { loan: loan._id, branchId: { $exists: false } },
            { branchId: branchOid },
          );
        }
      }
    } catch (e) {
      console.error('Branch self-healing failed:', e);
    }

    // Broad query for transactions
    const query = {
      $or: [
        { branchId: branchOid },
        { branchId: branchId },
        { customer: { $in: customerIds } },
        { member: { $in: memberIds } },
      ],
    };

    if (type) {
      query.type = type;
    }

    if (category && category !== 'all') {
      if (category === 'expense') {
        query.type = 'expense';
      } else {
        query.category = category;
      }
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchOr = [
        { description: searchRegex },
        { category: searchRegex },
      ];

      // Add numeric search for amount if the search term is a number
      const searchAmount = parseFloat(search);
      if (!isNaN(searchAmount)) {
        searchOr.push({ amount: searchAmount });
      }

      // Find matching customers and members for the search term to include them in the query
      const [matchingCustomers, matchingMembers] = await Promise.all([
        Customer.find({ name: searchRegex }).select('_id'),
        Member.find({ name: searchRegex }).select('_id'),
      ]);

      if (matchingCustomers.length > 0) {
        searchOr.push({
          customer: { $in: matchingCustomers.map((c) => c._id) },
        });
      }
      if (matchingMembers.length > 0) {
        searchOr.push({ member: { $in: matchingMembers.map((m) => m._id) } });
      }

      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const totalEntries = await FinancialTransaction.countDocuments(query);
    const financials = await FinancialTransaction.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name')
      .populate('member', 'name')
      .populate('loan', 'status')
      .populate('referenceId', 'name');

    // Base query for all-time branch data (unfiltered by date/search)
    const allTimeBranchQuery = {
      $or: [
        { branchId: branchOid },
        { branchId: branchId },
        { customer: { $in: customerIds } },
        { member: { $in: memberIds } },
      ],
    };

    // Get summary stats for the branch using model aggregates (source of truth)
    const [branchMembersStats, branchLoansStats, branchExpenses] =
      await Promise.all([
        Member.find({
          $or: [{ branchId: branchOid }, { branchId: branchId }],
        }).select('totalInvested totalWithdrawn currentBalance totalProfit'),
        Loan.find({
          $or: [
            { branchId: branchOid },
            { branchId: branchId },
            { customer: { $in: customerIds } },
          ],
          status: { $ne: 'rejected' },
        }).select('principal paidAmount'),
        FinancialTransaction.find({
          ...allTimeBranchQuery,
          type: 'expense',
        }).select('amount'),
      ]);

    const totalInvested = branchMembersStats.reduce(
      (sum, m) => sum + (m.totalInvested || 0),
      0,
    );
    const totalWithdrawn = branchMembersStats.reduce(
      (sum, m) => sum + (m.totalWithdrawn || 0),
      0,
    );
    const totalDeposits = Math.round(
      branchMembersStats.reduce((sum, m) => sum + (m.currentBalance || 0), 0),
    );

    const totalDisbursed = branchLoansStats.reduce(
      (sum, l) => sum + (l.principal || 0),
      0,
    );
    const totalRepaid = branchLoansStats.reduce(
      (sum, l) => sum + (l.paidAmount || 0),
      0,
    );

    const totalExpenses = branchExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );

    // Calculate Net Profit from Repayments (Interest Portion)
    const repayments = await Repayment.find(allTimeBranchQuery).populate(
      'loan',
      'principal totalAmount',
    );

    const calculateProfit = (repaymentsList) => {
      return repaymentsList.reduce((sum, r) => {
        if (!r.loan) return sum;

        // Prioritize explicit interestAmount
        if (r.interestAmount !== undefined && r.interestAmount !== null) {
          return sum + r.interestAmount;
        }

        // Fallback to ratio only if interestAmount is missing (legacy records)
        if (!r.loan.totalAmount || r.loan.totalAmount === 0) return sum;
        const totalInterest = r.loan.totalAmount - r.loan.principal;
        const profitRatio = totalInterest / r.loan.totalAmount;
        return sum + r.amount * profitRatio;
      }, 0);
    };
    const netProfit = Math.round(calculateProfit(repayments));

    res.json({
      data: financials,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
      summary: {
        totalTransactions: totalEntries,
        totalExpenses: totalExpenses,
        liquidity: Math.round(
          totalInvested +
            totalRepaid -
            totalDisbursed -
            totalWithdrawn -
            totalExpenses,
        ),
        totalDeposits: totalInvested,
        netProfit,
        totalDisbursed: totalDisbursed,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add a branch expense
// @route   POST /api/branches/:id/expenses
// @access  Private (Admin or Branch Manager)
const addBranchExpense = async (req, res) => {
  try {
    const { amount, category, description, date, staffId, paymentMethod } = req.body;
    const branchId = req.params.id;

    // Manager can only add expenses to their own branch
    if (req.user.isManager && req.user.role === 'staff') {
      if (req.user.managedBranchId?.toString() !== branchId) {
        return res
          .status(403)
          .json({ message: 'Not authorized to add expenses to this branch' });
      }
    }

    const expenseData = {
      user: req.user.effectiveOwnerId,
      branchId,
      type: 'expense',
      category: category || 'other',
      amount,
      description,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'cash',
    };

    // If it's a salary expense and staffId is provided, link it
    if (category === 'salary' && staffId) {
      expenseData.referenceId = staffId;
      expenseData.referenceModel = 'User';
    }

    const expense = await FinancialTransaction.create(expenseData);

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'branch_expense_added',
      category: 'branch',
      details: `Added ${category || 'other'} expense of ${amount} to branch: ${branchId}${staffId ? ' (Staff Salary)' : ''}`,
      metadata: {
        branchId,
        amount,
        expenseId: expense._id,
        staffId: staffId || null,
      },
      req,
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get branch analytics (Cash Flow)
// @route   GET /api/branches/:id/analytics
// @access  Private (Admin or Branch Manager)
const getBranchAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const branchId = req.params.id;
    const mongoose = require('mongoose');
    let branchOid;
    try {
      branchOid = new mongoose.Types.ObjectId(branchId);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid Branch ID' });
    }

    // Manager can only access their own branch analytics
    if (req.user.role === 'staff' && req.user.isManager) {
      if (req.user.managedBranchId?.toString() !== branchId) {
        return res
          .status(403)
          .json({ message: 'Not authorized to view this branch analytics' });
      }
    }

    // Get all customers and members associated with this branch to capture implicit records
    const [branchCustomers, branchMembers] = await Promise.all([
      Customer.find({
        $or: [{ branchId: branchOid }, { branchId: branchId }],
      }).select('_id'),
      Member.find({
        $or: [{ branchId: branchOid }, { branchId: branchId }],
      }).select('_id'),
    ]);

    const customerIds = branchCustomers.map((c) => c._id);
    const memberIds = branchMembers.map((m) => m._id);

    // Self-healing for this specific branch scope
    try {
      const orphans = await Loan.find({
        customer: { $in: customerIds },
        branchId: { $exists: false },
      });
      if (orphans.length > 0) {
        for (const loan of orphans) {
          await Loan.findByIdAndUpdate(loan._id, { branchId: branchOid });
          await Repayment.updateMany(
            { loan: loan._id, branchId: { $exists: false } },
            { branchId: branchOid },
          );
        }
      }
    } catch (e) {
      console.error('Branch analytics self-healing failed:', e);
    }

    const query = {
      $or: [
        { branchId: branchOid },
        { branchId: branchId },
        { customer: { $in: customerIds } },
        { member: { $in: memberIds } },
      ],
    };

    // Fetch primary sources using the broad branch query
    const [transactions, repayments, loans] = await Promise.all([
      FinancialTransaction.find(query),
      Repayment.find({
        $or: [
          { branchId: branchOid },
          { branchId: branchId },
          { customer: { $in: customerIds } },
        ],
      }).populate('loan', 'principal totalAmount'),
      Loan.find({
        $or: [
          { branchId: branchOid },
          { branchId: branchId },
          { customer: { $in: customerIds } },
        ],
        status: { $ne: 'rejected' },
      }),
    ]);

    const calculateProfitAtDateRange = (repaymentsList) => {
      return repaymentsList.reduce((sum, r) => {
        if (!r.loan) return sum;

        // Prioritize explicit interestAmount
        if (r.interestAmount !== undefined && r.interestAmount !== null) {
          return sum + r.interestAmount;
        }

        // Fallback to ratio only if interestAmount is missing (legacy records)
        if (!r.loan.totalAmount || r.loan.totalAmount === 0) return sum;
        const totalInterest = r.loan.totalAmount - r.loan.principal;
        const profitRatio = totalInterest / r.loan.totalAmount;
        return sum + r.amount * profitRatio;
      }, 0);
    };

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthlyHistory = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        const mStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const mEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

        const monthTransactions = transactions.filter(
          (t) => new Date(t.date) >= mStart && new Date(t.date) <= mEnd,
        );
        const monthRepayments = repayments.filter(
          (r) => new Date(r.date) >= mStart && new Date(r.date) <= mEnd,
        );

        monthlyHistory.push({
          name: monthNames[current.getMonth()],
          inflow: monthRepayments.reduce((sum, r) => sum + r.amount, 0),
          outflow: monthTransactions
            .filter(
              (t) => t.type === 'loan' && t.category === 'loan_disbursement',
            )
            .reduce((sum, t) => sum + t.amount, 0),
          profit: calculateProfitAtDateRange(monthRepayments),
          deposits: monthTransactions
            .filter((t) => t.category === 'investment')
            .reduce((sum, t) => sum + t.amount, 0),
          expenses: monthTransactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0),
        });

        current.setMonth(current.getMonth() + 1);
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const { start, end } = getMonthDates(i);
        const monthTransactions = transactions.filter(
          (t) => new Date(t.date) >= start && new Date(t.date) <= end,
        );
        const monthRepayments = repayments.filter(
          (r) => new Date(r.date) >= start && new Date(r.date) <= end,
        );

        monthlyHistory.push({
          name: monthNames[start.getMonth()],
          inflow: monthRepayments.reduce((sum, r) => sum + r.amount, 0),
          outflow: monthTransactions
            .filter(
              (t) => t.type === 'loan' && t.category === 'loan_disbursement',
            )
            .reduce((sum, t) => sum + t.amount, 0),
          profit: calculateProfitAtDateRange(monthRepayments),
          deposits: monthTransactions
            .filter((t) => t.category === 'investment')
            .reduce((sum, t) => sum + t.amount, 0),
          expenses: monthTransactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0),
        });
      }
    }

    const forecastHistory = [];
    if (!startDate) {
      const activeLoansList = loans.filter((l) => l.status === 'active');
      const loanRepaymentsCount = await Promise.all(
        activeLoansList.map(async (loan) => {
          const count = await Repayment.countDocuments({ loan: loan._id });
          return { id: loan._id.toString(), count };
        }),
      );

      const today = new Date();
      for (let i = 1; i <= 6; i++) {
        const forecastMonthDate = new Date(
          today.getFullYear(),
          today.getMonth() + i,
          1,
        );
        const monthStart = new Date(
          today.getFullYear(),
          today.getMonth() + i,
          1,
        );
        const monthEnd = new Date(
          today.getFullYear(),
          today.getMonth() + i + 1,
          0,
        );

        let monthProjected = 0;
        for (const loan of activeLoansList) {
          const rCount =
            loanRepaymentsCount.find((rc) => rc.id === loan._id.toString())
              ?.count || 0;
          for (let inst = rCount + 1; inst <= loan.duration; inst++) {
            const dueDate = new Date(loan.startDate);
            dueDate.setMonth(dueDate.getMonth() + inst);
            if (dueDate >= monthStart && dueDate <= monthEnd) {
              monthProjected += loan.emi;
            }
          }
        }

        forecastHistory.push({
          name: monthNames[forecastMonthDate.getMonth()],
          projected: monthProjected,
        });
      }
    }

    res.json([...monthlyHistory, ...forecastHistory]);
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
  getBranchFinancials,
  getBranchAnalytics,
  addBranchExpense,
};
