const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const Loan = require('../models/Loan');
const Payslip = require('../models/Payslip');
const { logActivity } = require('./activityLogController');
const { escapeRegExp } = require('../utils/stringUtils');

/**
 * Resolve the branch filter for a tenant query. Branch-manager staff are
 * narrowed to their managed branch; admins see the whole tenant.
 */
const branchScopeOf = (req) => {
  if (req.user.role === 'staff') {
    const scope = req.user.managedBranchId || req.user.branchId;
    if (scope) return { branchId: scope };
  }
  return {};
};

// @desc   Create an employee
// @route  POST /api/employees
// @access Private (manage_payroll)
const createEmployee = async (req, res) => {
  try {
    const { name, cnic } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });
    if (!cnic) return res.status(400).json({ message: 'cnic is required' });

    const employee = new Employee({
      ...req.body,
      user: req.user.effectiveOwnerId,
      // Staff create within their own branch; admins may pass any branchId.
      branchId:
        req.body.branchId ||
        req.user.managedBranchId ||
        req.user.branchId ||
        undefined,
    });
    await employee.save();

    await logActivity({
      userId: req.user._id,
      action: 'employee_created',
      category: 'payroll',
      details: `Created employee ${employee.name} (${employee.employeeId})`,
      metadata: { employeeId: employee._id },
      req,
    });

    res.status(201).json(employee);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: 'An employee with this identifier already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc   List employees (paginated, filterable)
// @route  GET /api/employees
// @access Private (manage_payroll)
const getEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, status, department } = req.query;

    const query = {
      user: req.user.effectiveOwnerId,
      ...branchScopeOf(req),
    };
    if (status) query.status = status;
    if (department) query.department = department;
    if (search) {
      const rx = new RegExp(escapeRegExp(search), 'i');
      query.$or = [
        { name: rx },
        { employeeId: rx },
        { department: rx },
        { designation: rx },
      ];
    }

    const totalEntries = await Employee.countDocuments(query);
    const data = await Employee.find(query)
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

// @desc   Get one employee + linked lending account (read-only)
// @route  GET /api/employees/:id
// @access Private (manage_payroll)
const getEmployee = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const employee = await Employee.findOne({
      _id: req.params.id,
      user: ownerId,
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let linkedAccount = null;
    if (employee.linkedCustomer) {
      // All linked reads stay tenant-scoped (404 semantics preserved).
      const customer = await Customer.findOne({
        _id: employee.linkedCustomer,
        user: ownerId,
      });
      if (customer) {
        const loans = await Loan.find({
          user: ownerId,
          customer: customer._id,
        })
          .select('principal emi totalAmount paidAmount remainingAmount status interestType startDate')
          .sort({ createdAt: -1 });

        let savings = null;
        if (customer.memberId) {
          const member = await Member.findOne({
            _id: customer.memberId,
            user: ownerId,
          }).select('currentBalance savingBalance shareBalance');
          if (member) {
            savings = {
              currentBalance: member.currentBalance,
              savingBalance: member.savingBalance,
              shareBalance: member.shareBalance,
            };
          }
        }

        linkedAccount = {
          customer: {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            trustRating: customer.trustRating,
          },
          loans,
          savings,
        };
      }
    }

    res.json({ employee, linkedAccount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Update an employee
// @route  PUT /api/employees/:id
// @access Private (manage_payroll)
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Whitelist mutable fields; never let user/employeeId/linked refs be spoofed
    // through the body. (linking has dedicated endpoints.)
    const immutable = ['user', 'employeeId', '_id', 'linkedCustomer', 'linkedMember', 'cnicHash', 'bankAccountNumberHash'];
    Object.keys(req.body).forEach((key) => {
      if (!immutable.includes(key)) employee[key] = req.body[key];
    });

    await employee.save(); // triggers PII re-encryption hooks

    await logActivity({
      userId: req.user._id,
      action: 'employee_updated',
      category: 'payroll',
      details: `Updated employee ${employee.name} (${employee.employeeId})`,
      metadata: { employeeId: employee._id },
      req,
    });

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Terminate an employee (soft delete — payslip history is retained)
// @route  DELETE /api/employees/:id
// @access Private (manage_payroll)
const terminateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.status = 'terminated';
    employee.terminationDate = new Date();
    employee.terminationReason = req.body.reason || '';
    await employee.save();

    await logActivity({
      userId: req.user._id,
      action: 'employee_terminated',
      category: 'payroll',
      details: `Terminated employee ${employee.name} (${employee.employeeId})`,
      metadata: { employeeId: employee._id, reason: employee.terminationReason },
      req,
    });

    res.json({ message: 'Employee terminated', employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Payslip history for an employee
// @route  GET /api/employees/:id/payslips
// @access Private (manage_payroll)
const getEmployeePayslips = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const employee = await Employee.findOne({ _id: req.params.id, user: ownerId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const query = { user: ownerId, employee: employee._id };

    const totalEntries = await Payslip.countDocuments(query);
    const data = await Payslip.find(query)
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

// @desc   Link an employee to a Customer (lending record)
// @route  POST /api/employees/:id/link-customer
// @access Private (manage_payroll)
const linkCustomer = async (req, res) => {
  try {
    const ownerId = req.user.effectiveOwnerId;
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ message: 'customerId is required' });
    }

    const employee = await Employee.findOne({ _id: req.params.id, user: ownerId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const customer = await Customer.findOne({ _id: customerId, user: ownerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    employee.linkedCustomer = customer._id;
    employee.linkedMember = customer.memberId || null;
    await employee.save();

    res.json({ message: 'Customer linked', employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Unlink an employee's Customer
// @route  DELETE /api/employees/:id/unlink-customer
// @access Private (manage_payroll)
const unlinkCustomer = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      user: req.user.effectiveOwnerId,
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.linkedCustomer = null;
    employee.linkedMember = null;
    await employee.save();

    res.json({ message: 'Customer unlinked', employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  terminateEmployee,
  getEmployeePayslips,
  linkCustomer,
  unlinkCustomer,
};
