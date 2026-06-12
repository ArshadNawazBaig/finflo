const FinancialTransaction = require('../models/FinancialTransaction');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const Customer = require('../models/Customer');
const { buildExport, FORMATS } = require('../services/accountingExportService');
const { jsonToCSV } = require('../utils/csv');
const { logActivity } = require('./activityLogController');

const isoDate = (x) => (x ? new Date(x).toISOString().slice(0, 10) : '');
const money = (x) => (Number(x) || 0).toFixed(2);
const addMonths = (d, n) => {
  const out = new Date(d);
  out.setMonth(out.getMonth() + Number(n || 0));
  return out;
};

// @desc   Export the ledger as an accounting-software-compatible CSV
// @route  GET /api/ledger/accounting-export?format=&startDate=&endDate=
// @access Private (protect)
const exportAccounting = async (req, res) => {
  try {
    const { format = 'generic', startDate, endDate } = req.query;
    if (!FORMATS.includes(format)) {
      return res.status(400).json({
        message: `Invalid format. Use one of: ${FORMATS.join(', ')}`,
      });
    }

    // Tenant scoping — mirror the ledger controller. Super admin sees all;
    // staff are narrowed to their branch.
    const query = req.user.isSuperAdmin
      ? {}
      : { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    // Only settled rows belong in the books — drop reversed/failed/pending.
    query.status = { $nin: ['Reversed', 'Failed', 'Pending'] };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const transactions = await FinancialTransaction.find(query)
      .populate('member', 'name')
      .populate('customer', 'name')
      .sort({ date: 1 })
      .lean();

    const { csv, filename } = buildExport(transactions, format);

    await logActivity({
      userId: req.user._id,
      action: 'accounting_export',
      category: 'system',
      details: `Exported ${transactions.length} ledger rows as ${format}`,
      metadata: { format, count: transactions.length, startDate, endDate },
      req,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const ENTITY_TYPES = ['loans', 'members', 'customers'];

// @desc   Export a position/schedule (loans receivable, member balances,
//         customers) as CSV — the supporting schedules behind the ledger.
// @route  GET /api/ledger/entity-export?type=loans|members|customers
// @access Private (protect + admin) — these listings carry member/customer PII
const exportEntities = async (req, res) => {
  try {
    const { type } = req.query;
    if (!ENTITY_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Invalid type. Use one of: ${ENTITY_TYPES.join(', ')}`,
      });
    }

    const owner = req.user.isSuperAdmin ? null : req.user.effectiveOwnerId;
    const scope = owner ? { user: owner } : {};

    let rows = [];
    let fields = [];

    if (type === 'loans') {
      // Receivables: outstanding (active/overdue) loans. No PII → lean is fine.
      const loans = await Loan.find({ ...scope, status: { $in: ['active', 'overdue'] } })
        .populate('customer', 'name')
        .populate('branchId', 'name')
        .sort({ startDate: 1 })
        .lean();
      rows = loans.map((l) => ({
        Reference: `LN-${String(l._id).slice(-8).toUpperCase()}`,
        Customer: l.customer?.name || '',
        Branch: l.branchId?.name || '',
        Principal: money(l.principal),
        TotalAmount: money(l.totalAmount),
        PaidAmount: money(l.paidAmount),
        Outstanding: money(l.remainingAmount),
        OutstandingPrincipal: money(l.outstandingPrincipal),
        LateFees: money(l.lateFeeAmount),
        Rate: l.rate ?? '',
        InterestType: l.interestType || '',
        Status: l.status,
        StartDate: isoDate(l.startDate),
        DueDate: l.startDate ? isoDate(addMonths(l.startDate, l.duration)) : '',
      }));
      fields = Object.keys(rows[0] || {
        Reference: '', Customer: '', Branch: '', Principal: '', TotalAmount: '',
        PaidAmount: '', Outstanding: '', OutstandingPrincipal: '', LateFees: '',
        Rate: '', InterestType: '', Status: '', StartDate: '', DueDate: '',
      });
    } else if (type === 'members') {
      // Deposit-liability schedule. Columns carry no encrypted PII → lean is fine.
      const members = await Member.find(scope)
        .populate('branchId', 'name')
        .sort({ name: 1 })
        .lean();
      rows = members.map((m) => ({
        Name: m.name || '',
        CurrentAccountNumber: m.currentAccountNumber || '',
        SavingAccountNumber: m.savingAccountNumber || '',
        Branch: m.branchId?.name || '',
        CurrentBalance: money(m.currentBalance),
        SavingBalance: money(m.savingBalance),
        ShareBalance: money(m.shareBalance),
        CreditLimit: money(m.creditLimit),
        Status: m.status || '',
      }));
      fields = Object.keys(rows[0] || {
        Name: '', CurrentAccountNumber: '', SavingAccountNumber: '', Branch: '',
        CurrentBalance: '', SavingBalance: '', ShareBalance: '', CreditLimit: '',
        Status: '',
      });
    } else {
      // Customers (non-member borrowers). CNIC/phone are encrypted, so use a
      // non-lean find so the post-find hooks decrypt them.
      const customers = await Customer.find(scope)
        .populate('branchId', 'name')
        .sort({ name: 1 });
      // Per-customer loan totals for the AR view.
      const totals = await Loan.aggregate([
        { $match: owner ? { user: owner } : {} },
        {
          $group: {
            _id: '$customer',
            borrowed: { $sum: '$principal' },
            outstanding: { $sum: '$remainingAmount' },
          },
        },
      ]);
      const totalsBy = new Map(totals.map((t) => [String(t._id), t]));
      rows = customers.map((c) => {
        const t = totalsBy.get(String(c._id)) || {};
        return {
          Name: c.name || '',
          CNIC: c.cnic || '',
          Phone: c.phone || '',
          Branch: c.branchId?.name || '',
          TrustRating: c.trustRating ?? '',
          Status: c.status || '',
          TotalBorrowed: money(t.borrowed),
          Outstanding: money(t.outstanding),
        };
      });
      fields = Object.keys(rows[0] || {
        Name: '', CNIC: '', Phone: '', Branch: '', TrustRating: '', Status: '',
        TotalBorrowed: '', Outstanding: '',
      });
    }

    const csv = jsonToCSV(rows, fields);
    const stamp = isoDate(new Date());

    await logActivity({
      userId: req.user._id,
      action: 'accounting_entity_export',
      category: 'system',
      details: `Exported ${rows.length} ${type} as CSV`,
      metadata: { type, count: rows.length },
      req,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-${stamp}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { exportAccounting, exportEntities };
