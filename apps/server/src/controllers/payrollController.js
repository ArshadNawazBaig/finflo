const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const LeaveRecord = require('../models/LeaveRecord');
const User = require('../models/User');
const payrollService = require('../services/payrollService');

// Map a service error (which may carry `.status`) to an HTTP response.
const fail = (res, error) =>
  res.status(error.status || 500).json({ message: error.message });

// @desc   Payroll dashboard stats
// @route  GET /api/payroll/dashboard
// @access Private (manage_payroll)
const getPayrollDashboard = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;

    const [totalEmployees, pendingLeaves, departmentAgg, lastRun, user] =
      await Promise.all([
        Employee.countDocuments({ user: ownerId, status: { $ne: 'terminated' } }),
        LeaveRecord.countDocuments({ user: ownerId, status: 'pending' }),
        Employee.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(ownerId), status: { $ne: 'terminated' } } },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        PayrollRun.findOne({ user: ownerId }).sort({ year: -1, month: -1 }),
        User.findById(ownerId).select('payrollSettings currency'),
      ]);

    // Estimated monthly base (gross of fixed salary components, excludes tax/
    // deductions which are computed per run). Cheap aggregate — not a full run.
    const estimateAgg = await Employee.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(ownerId), status: { $ne: 'terminated' } } },
      {
        $group: {
          _id: null,
          gross: {
            $sum: {
              $add: [
                { $ifNull: ['$basicSalary', 0] },
                { $ifNull: ['$houseRentAllowance', 0] },
                { $ifNull: ['$medicalAllowance', 0] },
                { $ifNull: ['$transportAllowance', 0] },
              ],
            },
          },
        },
      },
    ]);

    const payrollDay = user?.payrollSettings?.payrollDay || 25;
    const now = new Date();
    let nextPayrollDate = new Date(now.getFullYear(), now.getMonth(), payrollDay);
    if (nextPayrollDate < now) {
      nextPayrollDate = new Date(now.getFullYear(), now.getMonth() + 1, payrollDay);
    }

    res.json({
      totalEmployees,
      pendingLeaves,
      estimatedMonthlyGross: estimateAgg[0]?.gross || 0,
      departmentDistribution: departmentAgg.map((d) => ({
        department: d._id || 'Unassigned',
        count: d.count,
      })),
      lastRun: lastRun || null,
      nextPayrollDate,
      currency: user?.currency || 'Rs.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Generate a draft payroll run for a month
// @route  POST /api/payroll/run
// @access Private (manage_payroll)
const runPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    const { run, payslips } = await payrollService.runPayroll(req, { month, year });
    res.status(201).json({ run, payslipCount: payslips.length });
  } catch (error) {
    fail(res, error);
  }
};

// @desc   List payroll runs (paginated)
// @route  GET /api/payroll/runs
// @access Private (manage_payroll)
const getPayrollRuns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const query = { user: req.user.effectiveOwnerId };
    if (req.query.status) query.status = req.query.status;

    const totalEntries = await PayrollRun.countDocuments(query);
    const data = await PayrollRun.find(query)
      .sort({ year: -1, month: -1 })
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

// @desc   Payroll run detail with its payslips (paginated)
// @route  GET /api/payroll/runs/:id
// @access Private (manage_payroll)
const getPayrollRunDetail = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const run = await PayrollRun.findOne({ _id: req.params.id, user: ownerId });
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const query = { payrollRun: run._id, user: ownerId };
    if (req.query.status) query.status = req.query.status;

    const totalEntries = await Payslip.countDocuments(query);
    const payslips = await Payslip.find(query)
      .populate('employee', 'name employeeId department designation')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      run,
      payslips: {
        data: payslips,
        totalEntries,
        totalPages: Math.ceil(totalEntries / limit),
        currentPage: page,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Approve a draft payroll run
// @route  POST /api/payroll/runs/:id/approve
// @access Private (manage_payroll)
const approvePayrollRun = async (req, res) => {
  try {
    const run = await payrollService.approvePayrollRun(req, req.params.id);
    res.json(run);
  } catch (error) {
    fail(res, error);
  }
};

// @desc   Mark an approved run as paid (money movement)
// @route  POST /api/payroll/runs/:id/mark-paid
// @access Private (manage_payroll)
const markPayrollPaid = async (req, res) => {
  try {
    const run = await payrollService.markPayrollPaid(req, req.params.id, {
      paymentMethod: req.body.paymentMethod,
    });
    res.json(run);
  } catch (error) {
    fail(res, error);
  }
};

// @desc   Single payslip (JSON for client-side PDF rendering)
// @route  GET /api/payroll/payslips/:payslipId
// @access Private (manage_payroll)
const getPayslip = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const payslip = await Payslip.findOne({
      _id: req.params.payslipId,
      user: ownerId,
    })
      .populate('employee', 'name employeeId department designation bankName bankAccountNumber')
      .populate('payrollRun', 'month year status');
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });

    // Branding for the client-rendered PDF header.
    const business = await User.findById(ownerId).select(
      'businessName businessLogo businessAddress currency primaryColor',
    );

    res.json({ payslip, business });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPayrollDashboard,
  runPayroll,
  getPayrollRuns,
  getPayrollRunDetail,
  approvePayrollRun,
  markPayrollPaid,
  getPayslip,
};
