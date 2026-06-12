const GroupLoan = require('../models/GroupLoan');
const groupLoanService = require('../services/groupLoanService');
const { NotFoundError, ValidationError } = groupLoanService;

// Map a service error to the right HTTP status (NotFound → 404 so an unowned
// resource never leaks existence; ValidationError → 400; otherwise 500).
const sendServiceError = (res, error) => {
  if (error instanceof NotFoundError)
    return res.status(404).json({ message: error.message });
  if (error instanceof ValidationError)
    return res.status(400).json({ message: error.message });
  return res.status(500).json({ message: error.message });
};

// @desc   Create a group loan (one sub-loan per member, per-member amounts)
// @route  POST /api/groups/:id/loans
// @access Private (manage_loans)
const createGroupLoan = async (req, res) => {
  try {
    const { rate, duration, interestType, startDate, allocations } = req.body;
    const groupLoan = await groupLoanService.createGroupLoan(req, {
      groupId: req.params.id,
      rate,
      duration,
      interestType,
      startDate,
      allocations,
    });
    res.status(201).json(groupLoan);
  } catch (error) {
    sendServiceError(res, error);
  }
};

// @desc   List group loans (paginated)
// @route  GET /api/groups/loans
// @access Private
const getGroupLoans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = req.user.isSuperAdmin
      ? {}
      : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }
    if (req.query.group) query.group = req.query.group;
    if (req.query.status) query.status = req.query.status;

    const totalEntries = await GroupLoan.countDocuments(query);
    const data = await GroupLoan.find(query)
      .populate('group', 'name')
      .populate('allocations.customer', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      data,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get a single group loan with its sub-loan allocations
// @route  GET /api/groups/loans/:groupLoanId
// @access Private
const getGroupLoanById = async (req, res) => {
  try {
    const query = { _id: req.params.groupLoanId };
    if (!req.user.isSuperAdmin) query.user = req.user.effectiveOwnerId;
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    const groupLoan = await GroupLoan.findOne(query)
      .populate('group', 'name status guaranteePolicy')
      .populate('allocations.customer', 'name')
      .populate('allocations.loan', 'status principal paidAmount remainingAmount emi');
    if (!groupLoan)
      return res.status(404).json({ message: 'Group loan not found' });

    res.json(groupLoan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Approve & disburse a pending group loan
// @route  POST /api/groups/loans/:groupLoanId/approve
// @access Private (staff or admin)
const approveGroupLoan = async (req, res) => {
  try {
    const groupLoan = await groupLoanService.approveGroupLoan(
      req,
      req.params.groupLoanId,
    );
    res.json(groupLoan);
  } catch (error) {
    sendServiceError(res, error);
  }
};

// @desc   Record a repayment against a group loan (group payment or per-member)
// @route  POST /api/groups/loans/:groupLoanId/repayment
// @access Private (staff or admin)
const addGroupRepayment = async (req, res) => {
  try {
    const {
      amount,
      allocations,
      settle,
      deductFromWallet,
      date,
      notes,
      paymentMethod,
    } = req.body;
    const summary = await groupLoanService.processGroupRepayment(req, {
      groupLoanId: req.params.groupLoanId,
      amount,
      allocations,
      settle,
      deductFromWallet,
      date,
      notes,
      paymentMethod,
    });
    res.json(summary);
  } catch (error) {
    sendServiceError(res, error);
  }
};

// @desc   Renew a group loan (rollover | topup | extend)
// @route  POST /api/groups/loans/:groupLoanId/renew
// @access Private (staff or admin)
const renewGroupLoan = async (req, res) => {
  try {
    const { renewalType, rate, duration, interestType, startDate, allocations } =
      req.body;
    const result = await groupLoanService.renewGroupLoan(req, {
      groupLoanId: req.params.groupLoanId,
      renewalType,
      rate,
      duration,
      interestType,
      startDate,
      allocations,
    });
    res.status(201).json(result);
  } catch (error) {
    sendServiceError(res, error);
  }
};

module.exports = {
  createGroupLoan,
  getGroupLoans,
  getGroupLoanById,
  approveGroupLoan,
  addGroupRepayment,
  renewGroupLoan,
};
