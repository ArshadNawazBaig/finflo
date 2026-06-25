const LeaveRecord = require('../models/LeaveRecord');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { logActivity } = require('./activityLogController');

// Whole days inclusive of both endpoints.
const daysBetween = (start, end) => {
  const ms = new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0);
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
};

// @desc   Create a leave request
// @route  POST /api/leaves
// @access Private (manage_payroll)
const createLeaveRequest = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const { employeeId, type, startDate, endDate, reason } = req.body;
    if (!employeeId || !type || !startDate || !endDate) {
      return res.status(400).json({
        message: 'employeeId, type, startDate and endDate are required',
      });
    }

    const employee = await Employee.findOne({ _id: employeeId, user: ownerId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const totalDays = daysBetween(startDate, endDate);
    if (totalDays <= 0) {
      return res.status(400).json({ message: 'endDate must be on or after startDate' });
    }

    const leave = await LeaveRecord.create({
      user: ownerId,
      branchId: employee.branchId,
      employee: employee._id,
      type,
      startDate,
      endDate,
      totalDays,
      reason: reason || '',
    });

    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   List leave requests (paginated)
// @route  GET /api/leaves
// @access Private (manage_payroll)
const getLeaveRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = { user: req.user.effectiveOwnerId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.employeeId) query.employee = req.query.employeeId;
    if (req.user.role === 'staff') {
      const scope = req.user.managedBranchId || req.user.branchId;
      if (scope) query.branchId = scope;
    }

    const totalEntries = await LeaveRecord.countDocuments(query);
    const data = await LeaveRecord.find(query)
      .populate('employee', 'name employeeId department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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

const decide = async (req, res, status) => {
  try {
    const leave = await LeaveRecord.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res
        .status(400)
        .json({ message: `Leave request is already ${leave.status}` });
    }

    leave.status = status;
    leave.approvedBy = req.user._id;
    leave.remarks = req.body.remarks || '';
    await leave.save();

    await logActivity({
      userId: req.user._id,
      action: `leave_${status}`,
      category: 'payroll',
      details: `Leave request ${status} for employee ${leave.employee}`,
      metadata: { leaveId: leave._id },
      req,
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Approve a leave request
// @route  PUT /api/leaves/:id/approve
const approveLeave = (req, res) => decide(req, res, 'approved');

// @desc   Reject a leave request
// @route  PUT /api/leaves/:id/reject
const rejectLeave = (req, res) => decide(req, res, 'rejected');

// @desc   Leave balance for an employee (per type, current year)
// @route  GET /api/leaves/balance/:employeeId
// @access Private (manage_payroll)
const getLeaveBalance = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const employee = await Employee.findOne({
      _id: req.params.employeeId,
      user: ownerId,
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const user = await User.findById(ownerId).select('payrollSettings');
    const allowances = user?.payrollSettings?.leaveSettings || {
      annualLeave: 14,
      sickLeave: 10,
      casualLeave: 10,
    };

    const year = parseInt(req.query.year) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const used = await LeaveRecord.aggregate([
      {
        $match: {
          user: employee.user,
          employee: employee._id,
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd },
        },
      },
      { $group: { _id: '$type', days: { $sum: '$totalDays' } } },
    ]);
    const usedByType = used.reduce((acc, u) => ({ ...acc, [u._id]: u.days }), {});

    res.json({
      year,
      balance: {
        annual: { entitled: allowances.annualLeave, used: usedByType.annual || 0 },
        sick: { entitled: allowances.sickLeave, used: usedByType.sick || 0 },
        casual: { entitled: allowances.casualLeave, used: usedByType.casual || 0 },
        unpaid: { entitled: null, used: usedByType.unpaid || 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
};
