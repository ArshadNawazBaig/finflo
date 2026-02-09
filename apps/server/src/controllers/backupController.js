const User = require('../models/User');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Repayment = require('../models/Repayment');
const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('./activityLogController');

// Helper function to convert JSON to CSV
const jsonToCSV = (data, fields) => {
  if (!data || data.length === 0) return '';

  const headers = fields
    .map((f) => (typeof f === 'object' ? f.label : f))
    .join(',');
  const rows = data.map((item) => {
    return fields
      .map((field) => {
        const fieldKey = typeof field === 'object' ? field.key : field;
        const value = fieldKey
          .split('.')
          .reduce((obj, key) => obj?.[key], item);
        // Escape commas and quotes in CSV
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
};

// ... (exportUsers stays mostly the same)
const exportUsers = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const users = await User.find({ role: { $ne: 'super_admin' } })
      .select('-password -refreshToken')
      .lean();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=users_${Date.now()}.json`,
      );
      return res.json(users);
    }

    // CSV format
    const fields = [
      '_id',
      'name',
      'email',
      'businessName',
      'plan',
      'role',
      'isActive',
      'createdAt',
    ];
    const csv = jsonToCSV(users, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=users_${Date.now()}.csv`,
    );
    res.send(csv);

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'export_users',
      category: 'admin',
      details: `Admin exported ${users.length} users as ${format.toUpperCase()}`,
      req,
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ message: 'Failed to export users' });
  }
};

// Export Loans (Enhanced for Accounting)
const exportLoans = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;

    let query = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const loans = await Loan.find(query)
      .populate('user', 'name email businessName')
      .populate('customer', 'name email phone')
      .lean();

    // Flatten populated fields and add financial metrics
    const flattenedLoans = loans.map((loan) => ({
      _id: loan._id,
      userName: loan.user?.name,
      businessName: loan.user?.businessName,
      customerName: loan.customer?.name,
      customerPhone: loan.customer?.phone,
      principal: loan.principal,
      rate: loan.rate,
      duration: loan.duration,
      emi: loan.emi,
      totalAmount: loan.totalAmount,
      paidAmount: loan.paidAmount,
      remainingAmount: loan.remainingAmount,
      interestType: loan.interestType,
      status: loan.status,
      startDate: loan.startDate,
      createdAt: loan.createdAt,
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=loans_portfolio_${Date.now()}.json`,
      );
      return res.json(flattenedLoans);
    }

    // CSV format with clear accounting headers
    const fields = [
      { key: '_id', label: 'Loan ID' },
      { key: 'userName', label: 'Admin/User' },
      { key: 'businessName', label: 'Business' },
      { key: 'customerName', label: 'Customer' },
      { key: 'customerPhone', label: 'Phone' },
      { key: 'principal', label: 'Principal Amount' },
      { key: 'rate', label: 'Interest Rate %' },
      { key: 'duration', label: 'Duration (Mo)' },
      { key: 'emi', label: 'Monthly EMI' },
      { key: 'totalAmount', label: 'Total Repayable' },
      { key: 'paidAmount', label: 'Amount Paid' },
      { key: 'remainingAmount', label: 'Balance Outstanding' },
      { key: 'interestType', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Loan Start Date' },
      { key: 'createdAt', label: 'Record Created' },
    ];

    const csv = jsonToCSV(flattenedLoans, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=loans_portfolio_${Date.now()}.csv`,
    );
    res.send(csv);

    await logActivity({
      userId: req.user._id,
      action: 'export_loans',
      category: 'admin',
      details: `Admin exported ${loans.length} loans as ${format.toUpperCase()}`,
      req,
    });
  } catch (error) {
    console.error('Error exporting loans:', error);
    res.status(500).json({ message: 'Failed to export loans' });
  }
};

// Export Repayments (Transaction Ledger)
const exportRepayments = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;

    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const repayments = await Repayment.find(query)
      .populate('user', 'name businessName')
      .populate('customer', 'name email')
      .populate('loan', 'principal emi')
      .lean();

    const flattenedData = repayments.map((r) => ({
      _id: r._id,
      loanId: r.loan?._id,
      businessName: r.user?.businessName,
      customerName: r.customer?.name,
      amount: r.amount,
      date: r.date,
      notes: r.notes || '',
      loanPrincipal: r.loan?.principal,
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=repayments_ledger_${Date.now()}.json`,
      );
      return res.json(flattenedData);
    }

    const fields = [
      { key: '_id', label: 'Transaction ID' },
      { key: 'loanId', label: 'Loan Reference' },
      { key: 'businessName', label: 'Business' },
      { key: 'customerName', label: 'Customer' },
      { key: 'amount', label: 'Payment Amount' },
      { key: 'date', label: 'Payment Date' },
      { key: 'notes', label: 'Notes' },
      { key: 'loanPrincipal', label: 'Loan Principal Reference' },
    ];

    const csv = jsonToCSV(flattenedData, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=repayments_ledger_${Date.now()}.csv`,
    );
    res.send(csv);

    await logActivity({
      userId: req.user._id,
      action: 'export_repayments',
      category: 'admin',
      details: `Admin exported ${repayments.length} repayments as ${format.toUpperCase()}`,
      req,
    });
  } catch (error) {
    console.error('Error exporting repayments:', error);
    res.status(500).json({ message: 'Failed to export repayments' });
  }
};

// Export Customers
const exportCustomers = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const customers = await Customer.find()
      .populate('user', 'name email businessName')
      .lean();

    // Flatten populated fields
    const flattenedCustomers = customers.map((customer) => ({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      userName: customer.user?.name,
      userEmail: customer.user?.email,
      createdAt: customer.createdAt,
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=customers_${Date.now()}.json`,
      );
      return res.json(flattenedCustomers);
    }

    // CSV format
    const fields = [
      '_id',
      'name',
      'email',
      'phone',
      'address',
      'userName',
      'userEmail',
      'createdAt',
    ];
    const csv = jsonToCSV(flattenedCustomers, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=customers_${Date.now()}.csv`,
    );
    res.send(csv);

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'export_customers',
      category: 'admin',
      details: `Admin exported ${customers.length} customers as ${format.toUpperCase()}`,
      req,
    });
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ message: 'Failed to export customers' });
  }
};

// Export Activity Logs
const exportActivityLogs = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const logs = await ActivityLog.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Flatten populated fields
    const flattenedLogs = logs.map((log) => ({
      _id: log._id,
      userName: log.user?.name,
      userEmail: log.user?.email,
      action: log.action,
      category: log.category,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=activity_logs_${Date.now()}.json`,
      );
      return res.json(flattenedLogs);
    }

    // CSV format
    const fields = [
      '_id',
      'userName',
      'userEmail',
      'action',
      'category',
      'details',
      'ipAddress',
      'createdAt',
    ];
    const csv = jsonToCSV(flattenedLogs, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=activity_logs_${Date.now()}.csv`,
    );
    res.send(csv);

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'export_activity_logs',
      category: 'admin',
      details: `Admin exported ${logs.length} activity logs as ${format.toUpperCase()}`,
      req,
    });
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    res.status(500).json({ message: 'Failed to export activity logs' });
  }
};

module.exports = {
  exportUsers,
  exportLoans,
  exportRepayments,
  exportCustomers,
  exportActivityLogs,
};
