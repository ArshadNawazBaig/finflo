const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const Loan = require('../models/Loan');
const FinancialTransaction = require('../models/FinancialTransaction');
const { addMoney, subMoney, roundMoney } = require('../utils/money');
const { processRepayment } = require('./loanRepaymentService');
const { logActivity } = require('../controllers/activityLogController');
const logger = require('../utils/logger');

/**
 * Payroll financial engine. All money math runs through utils/money; all money
 * movement runs in a MongoDB transaction with a FinancialTransaction ledger
 * trail; loan-EMI deductions settle the borrower's loan through the canonical
 * loanRepaymentService (never re-implemented here).
 *
 * Lifecycle: runPayroll (draft, no money) → approvePayrollRun (lock) →
 * markPayrollPaid (the ONLY money-movement step; idempotent).
 *
 * Scope: payroll is a TENANT-WIDE admin operation. A run covers every active
 * employee across all branches, so the PayrollRun unique (user, year, month)
 * index holds. Per-branch views are achieved by reading each payslip's branchId.
 */

// Pakistan FBR salaried annual income-tax slabs (TY 2024-25) — seeded default,
// fully overridable per tenant via payrollSettings.taxSlabs.
const DEFAULT_TAX_SLABS = [
  { min: 0, max: 600000, rate: 0 },
  { min: 600000, max: 1200000, rate: 5 },
  { min: 1200000, max: 2200000, rate: 15 },
  { min: 2200000, max: 3200000, rate: 25 },
  { min: 3200000, max: 4100000, rate: 30 },
  { min: 4100000, max: null, rate: 35 },
];

const DEFAULT_PAYROLL_SETTINGS = {
  workingDaysPerMonth: 26,
  standardWorkHours: 8,
  defaultTaxSlabType: 'slab',
  taxSlabs: DEFAULT_TAX_SLABS,
  providentFundRate: 8.33,
  eobiEnabled: true,
  eobiAmount: 250,
  payrollDay: 25,
};

/**
 * Resolve a tenant's payroll settings, merging stored values over the defaults
 * (a tenant that never configured payroll still gets sane FBR-based behavior).
 */
const resolveSettings = (user) => {
  const stored =
    (user && user.payrollSettings && typeof user.payrollSettings.toObject === 'function'
      ? user.payrollSettings.toObject()
      : user && user.payrollSettings) || {};
  const merged = { ...DEFAULT_PAYROLL_SETTINGS, ...stored };
  if (!Array.isArray(merged.taxSlabs) || merged.taxSlabs.length === 0) {
    merged.taxSlabs = DEFAULT_TAX_SLABS;
  }
  return merged;
};

/**
 * Monthly income tax for a given monthly gross. Flat → gross × employee.taxRate.
 * Slab → progressive marginal tax on the annualised gross, divided by 12.
 */
const computeMonthlyTax = (monthlyGross, employee, settings) => {
  const slabType = employee.taxSlabType || settings.defaultTaxSlabType || 'slab';

  if (slabType === 'flat') {
    return roundMoney((monthlyGross * (employee.taxRate || 0)) / 100);
  }

  const slabs = settings.taxSlabs || [];
  if (!slabs.length) return 0;

  const annual = monthlyGross * 12;
  let annualTax = 0;
  for (const slab of slabs) {
    if (annual <= slab.min) continue;
    const upper = slab.max == null ? annual : Math.min(annual, slab.max);
    const taxable = Math.max(0, upper - slab.min);
    annualTax += (taxable * slab.rate) / 100;
  }
  return roundMoney(annualTax / 12);
};

/**
 * The active loan (if any) backing an employee's linked customer. Picks the
 * oldest still-collectable loan. Returns null when nothing is owed.
 */
const findActiveLoan = (ownerId, linkedCustomer, session = null) => {
  if (!linkedCustomer) return Promise.resolve(null);
  return Loan.findOne({
    user: ownerId,
    customer: linkedCustomer,
    status: { $in: ['active', 'overdue'] },
  })
    .sort({ createdAt: 1 })
    .session(session);
};

/**
 * Pure-ish payslip computation for one employee given the EMI to withhold.
 * `loanEMI` is pre-capped by the caller so we never withhold more than is owed.
 */
const buildPayslipData = (employee, settings, loanEMI = 0) => {
  const basic = employee.basicSalary || 0;
  const allowancesSum = (employee.otherAllowances || []).reduce(
    (sum, a) => sum + (a.amount || 0),
    0,
  );

  const gross = addMoney(
    basic,
    employee.houseRentAllowance || 0,
    employee.medicalAllowance || 0,
    employee.transportAllowance || 0,
    allowancesSum,
  );

  const tax = computeMonthlyTax(gross, employee, settings);
  const providentFund = employee.providentFundEnabled
    ? roundMoney((basic * (employee.providentFundRate || 0)) / 100)
    : 0;
  const eobi = employee.eobiEnabled ? settings.eobiAmount || 0 : 0;
  const savingsContribution = employee.savingsContribution || 0;
  const emi = roundMoney(loanEMI || 0);

  const totalDeductions = addMoney(
    tax,
    providentFund,
    eobi,
    emi,
    savingsContribution,
  );
  // Clamp: deductions can never make net pay negative.
  const netPay = Math.max(0, subMoney(gross, totalDeductions));

  return {
    earnings: {
      basic,
      hra: employee.houseRentAllowance || 0,
      medical: employee.medicalAllowance || 0,
      transport: employee.transportAllowance || 0,
      otherAllowances: roundMoney(allowancesSum),
      overtime: 0,
    },
    deductions: {
      tax,
      providentFund,
      eobi,
      loanEMI: emi,
      savingsContribution,
      otherDeductions: 0,
    },
    gross,
    totalDeductions,
    netPay,
  };
};

/**
 * Run (or re-run) a DRAFT payroll for a tenant's month. No money moves here.
 * Idempotent: get-or-create the run, then upsert a draft payslip per active
 * employee. A run that is already approved/paid is returned untouched.
 *
 * @returns {Promise<{ run, payslips }>}
 */
const runPayroll = async (req, { month, year }) => {
  const ownerId = req.user.effectiveOwnerId;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!m || m < 1 || m > 12) throw new Error('A valid month (1-12) is required');
  if (!y || y < 2000) throw new Error('A valid year is required');

  // Get-or-create the run (unique index on user+year+month guarantees one).
  const run = await PayrollRun.findOneAndUpdate(
    { user: ownerId, year: y, month: m },
    { $setOnInsert: { user: ownerId, year: y, month: m, status: 'draft', runDate: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (run.status !== 'draft') {
    const payslips = await Payslip.find({ payrollRun: run._id });
    return { run, payslips };
  }

  const user = await mongoose.model('User').findById(ownerId).select('payrollSettings');
  const settings = resolveSettings(user);

  const employees = await Employee.find({
    user: ownerId,
    status: { $ne: 'terminated' },
  });

  const payslips = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const employee of employees) {
    const loan = await findActiveLoan(ownerId, employee.linkedCustomer);
    const emiToWithhold = loan
      ? Math.min(loan.emi || 0, loan.remainingAmount || 0)
      : 0;

    const data = buildPayslipData(employee, settings, emiToWithhold);

    const payslip = await Payslip.findOneAndUpdate(
      { employee: employee._id, payrollRun: run._id },
      {
        $set: {
          user: ownerId,
          branchId: employee.branchId,
          month: m,
          year: y,
          earnings: data.earnings,
          deductions: data.deductions,
          gross: data.gross,
          totalDeductions: data.totalDeductions,
          netPay: data.netPay,
          status: 'draft',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    payslips.push(payslip);
    totalGross = addMoney(totalGross, data.gross);
    totalDeductions = addMoney(totalDeductions, data.totalDeductions);
    totalNet = addMoney(totalNet, data.netPay);
  }

  // Drop any stale payslips for employees no longer in this run (e.g. terminated
  // after a prior draft) so totals and the detail view stay consistent.
  const keepIds = payslips.map((p) => p._id);
  await Payslip.deleteMany({
    payrollRun: run._id,
    _id: { $nin: keepIds },
    status: 'draft',
  });

  run.employeeCount = payslips.length;
  run.totalGross = totalGross;
  run.totalDeductions = totalDeductions;
  run.totalNet = totalNet;
  await run.save();

  await logActivity({
    userId: req.user._id,
    action: 'payroll_run_created',
    category: 'payroll',
    details: `Payroll draft generated for ${m}/${y} — ${payslips.length} employees, net Rs. ${totalNet}`,
    metadata: { runId: run._id, month: m, year: y },
    req,
  });

  return { run, payslips };
};

/**
 * Lock a draft run: draft → approved, and approve all its payslips. Atomic.
 */
const approvePayrollRun = async (req, runId) => {
  const ownerId = req.user.effectiveOwnerId;
  const run = await PayrollRun.findOne({ _id: runId, user: ownerId });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.status = 404;
    throw err;
  }
  if (run.status !== 'draft') {
    const err = new Error(`Cannot approve a run with status '${run.status}'`);
    err.status = 400;
    throw err;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Payslip.updateMany(
        { payrollRun: run._id, status: 'draft' },
        { $set: { status: 'approved' } },
        { session },
      );
      run.status = 'approved';
      run.approvedBy = req.user._id;
      run.approvedAt = new Date();
      await run.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await logActivity({
    userId: req.user._id,
    action: 'payroll_run_approved',
    category: 'payroll',
    details: `Payroll run ${run.month}/${run.year} approved`,
    metadata: { runId: run._id },
    req,
  });

  return run;
};

/**
 * Mark an approved run as paid — the ONLY money-movement step.
 *
 * In one transaction, for each approved (not-yet-paid) payslip:
 *  - settle the linked loan's EMI via loanRepaymentService.processRepayment
 *    (deductFromWallet:false — the employer withholds it from salary), recording
 *    loanRepaymentRef on the payslip;
 *  - write a FinancialTransaction (expense / category 'payroll') for the net pay
 *    actually disbursed;
 *  - flip the payslip to paid.
 *
 * Idempotent: already-paid payslips are skipped, so a retry after a partial
 * failure is safe. On any throw the whole transaction rolls back (no partial pay,
 * no leaked loan settlement, no orphan ledger row).
 *
 * NOTE (v1 scope): the ledger recognises NET cash disbursed as the payroll
 * expense, plus the loan EMI as repayment income (via the repayment service).
 * Statutory remittance of withheld tax/PF/EOBI as separate liabilities, and
 * gross-vs-net expense recognition, are deliberately deferred to v2.
 */
const markPayrollPaid = async (req, runId, { paymentMethod = 'bank' } = {}) => {
  const ownerId = req.user.effectiveOwnerId;
  const run = await PayrollRun.findOne({ _id: runId, user: ownerId });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.status = 404;
    throw err;
  }
  if (run.status !== 'approved' && run.status !== 'paid') {
    const err = new Error(
      `Only an approved run can be paid (current status: '${run.status}')`,
    );
    err.status = 400;
    throw err;
  }

  // Ledger paymentMethod is limited to cash/online; the richer label lives on
  // the payslip/run.
  const ledgerMethod = paymentMethod === 'cash' ? 'cash' : 'online';

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payslips = await Payslip.find({
        payrollRun: run._id,
        status: { $ne: 'paid' },
      }).session(session);

      for (const payslip of payslips) {
        const employee = await Employee.findOne({
          _id: payslip.employee,
          user: ownerId,
        }).session(session);
        if (!employee) continue;

        // Settle the linked loan's EMI through the canonical service.
        if (payslip.deductions?.loanEMI > 0 && employee.linkedCustomer) {
          const loan = await findActiveLoan(
            ownerId,
            employee.linkedCustomer,
            session,
          );
          if (loan) {
            const settleAmount = Math.min(
              payslip.deductions.loanEMI,
              loan.remainingAmount || 0,
            );
            if (settleAmount > 0) {
              const { repayment } = await processRepayment(
                loan,
                settleAmount,
                req,
                {
                  session,
                  deductFromWallet: false,
                  isAutoValue: true,
                  notes: `Payroll deduction ${run.month}/${run.year}`,
                  paymentMethod: ledgerMethod,
                },
              );
              payslip.loanRepaymentRef = repayment._id;
            }
          }
        }

        // Net cash disbursed to the employee → payroll expense ledger row.
        await FinancialTransaction.create(
          [
            {
              user: ownerId,
              branchId: payslip.branchId || employee.branchId,
              type: 'expense',
              category: 'payroll',
              amount: payslip.netPay,
              date: new Date(),
              description: `Payroll ${run.month}/${run.year} — ${employee.name} (${employee.employeeId})`,
              referenceId: payslip._id,
              referenceModel: 'Payslip',
              paymentMethod: ledgerMethod,
            },
          ],
          { session },
        );

        payslip.status = 'paid';
        payslip.paidAt = new Date();
        payslip.paymentMethod = paymentMethod;
        await payslip.save({ session });
      }

      run.status = 'paid';
      run.paidAt = new Date();
      run.paymentMethod = paymentMethod;
      await run.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await logActivity({
    userId: req.user._id,
    action: 'payroll_run_paid',
    category: 'payroll',
    details: `Payroll run ${run.month}/${run.year} marked paid (net Rs. ${run.totalNet})`,
    metadata: { runId: run._id },
    req,
  });

  return run;
};

module.exports = {
  runPayroll,
  approvePayrollRun,
  markPayrollPaid,
  // exported for unit tests / reuse
  computeMonthlyTax,
  buildPayslipData,
  resolveSettings,
  findActiveLoan,
  DEFAULT_TAX_SLABS,
  DEFAULT_PAYROLL_SETTINGS,
};
