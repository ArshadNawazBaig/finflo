const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const Loan = require('../models/Loan');
const PayrollTransaction = require('../models/PayrollTransaction');
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
 * Normalise admin-added deduction input into clean line items + a total. Accepts
 * either an array of `{ label, amount }` or a bare number (legacy single total).
 * Drops zero/negative rows; rounds every amount to 2 dp.
 */
const normalizeDeductions = (input) => {
  if (!Array.isArray(input)) {
    const total = roundMoney(Math.max(0, Number(input) || 0));
    return { lines: [], total };
  }
  const lines = input
    .map((d) => ({
      label: String((d && d.label) || '').trim() || 'Deduction',
      amount: roundMoney(Math.max(0, Number(d && d.amount) || 0)),
    }))
    .filter((d) => d.amount > 0);
  const total = lines.reduce((sum, d) => addMoney(sum, d.amount), 0);
  return { lines, total };
};

/**
 * Pure-ish payslip computation for one employee given the EMI to withhold.
 * `loanEMI` is pre-capped by the caller so we never withhold more than is owed.
 *
 * For a `payType: 'variable'` (freelance) employee the gross is NOT derived from
 * a static salary — pass the entered amount as `opts.variableGross`. Their fixed
 * allowance structure is ignored (gross = the entered amount) and the loan EMI is
 * additionally capped to what the pay can cover, so a freelance month never
 * settles more loan than the employee was actually paid.
 *
 * `opts.extraDeductions` are admin-added ad-hoc deduction line items (or a bare
 * total) folded into `otherDeductions` and the net.
 */
const buildPayslipData = (employee, settings, loanEMI = 0, opts = {}) => {
  const isVariable = employee.payType === 'variable';
  const extra = normalizeDeductions(opts.extraDeductions);
  const otherDeductions = extra.total;

  const basic = isVariable
    ? roundMoney(opts.variableGross || 0)
    : employee.basicSalary || 0;
  const allowancesSum = isVariable
    ? 0
    : (employee.otherAllowances || []).reduce(
        (sum, a) => sum + (a.amount || 0),
        0,
      );

  const gross = isVariable
    ? basic
    : addMoney(
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

  let emi = roundMoney(loanEMI || 0);
  if (isVariable) {
    // Never withhold (and later settle) more loan than the freelance pay covers
    // after statutory/other deductions.
    const room = Math.max(
      0,
      subMoney(gross, tax, providentFund, eobi, savingsContribution, otherDeductions),
    );
    emi = Math.min(emi, room);
  }

  const totalDeductions = addMoney(
    tax,
    providentFund,
    eobi,
    emi,
    savingsContribution,
    otherDeductions,
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
      otherDeductions,
      customDeductions: extra.lines,
    },
    gross,
    totalDeductions,
    netPay,
  };
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Run (or re-run) a DRAFT payroll for a tenant's month. No money moves here.
 * Idempotent: get-or-create the run, then upsert a draft payslip per active
 * employee — so re-running a DRAFT picks up newly added/removed employees.
 *
 * A run that is already approved/paid is LOCKED: re-running throws (it used to
 * silently return the stale run, which looked like "only the first employee
 * shows" after adding more). Reopen the run to draft first (reopenPayrollRun).
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
    const err = new Error(
      `Payroll for ${MONTH_NAMES[m - 1]} ${y} is already ${run.status} and is locked. ` +
        `Reopen it to a draft to add or update employees, then regenerate.`,
    );
    err.status = 400;
    throw err;
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
    const isVariable = employee.payType === 'variable';

    const existing = await Payslip.findOne({
      employee: employee._id,
      payrollRun: run._id,
    });

    // Preserve a freelance amount already entered on this draft — re-running the
    // month (e.g. after adding an employee) must not wipe finalized variable pay
    // (or its admin-added deductions).
    if (isVariable && existing && existing.amountFinalized) {
      payslips.push(existing);
      totalGross = addMoney(totalGross, existing.gross);
      totalDeductions = addMoney(totalDeductions, existing.totalDeductions);
      totalNet = addMoney(totalNet, existing.netPay);
      continue;
    }

    // Carry forward any deductions the admin already added to this draft.
    const extraDeductions = existing?.deductions?.customDeductions || [];

    // Variable employees come in at 0 until their month's pay is entered; the
    // loan EMI is deferred to that point (see setVariablePayslipAmount).
    const loan = isVariable
      ? null
      : await findActiveLoan(ownerId, employee.linkedCustomer);
    const emiToWithhold = loan
      ? Math.min(loan.emi || 0, loan.remainingAmount || 0)
      : 0;

    const data = buildPayslipData(employee, settings, emiToWithhold, {
      ...(isVariable ? { variableGross: 0 } : {}),
      extraDeductions,
    });

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
          isVariable,
          rate: isVariable ? employee.payRate || 0 : 0,
          amountFinalized: !isVariable, // fixed pay is final on generation
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
 * Re-sum a run's payslips into its header totals. Cheap; called after a single
 * variable payslip is edited so the run summary stays consistent.
 */
const recomputeRunTotals = async (run, session = null) => {
  const slips = await Payslip.find({ payrollRun: run._id }).session(session);
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  for (const p of slips) {
    totalGross = addMoney(totalGross, p.gross);
    totalDeductions = addMoney(totalDeductions, p.totalDeductions);
    totalNet = addMoney(totalNet, p.netPay);
  }
  run.employeeCount = slips.length;
  run.totalGross = totalGross;
  run.totalDeductions = totalDeductions;
  run.totalNet = totalNet;
  await run.save({ session });
  return run;
};

/**
 * Set the month's pay for a variable/freelance employee's payslip on a DRAFT
 * run. Recomputes deductions (tax/PF/EOBI/loan-EMI) for the entered gross,
 * marks the payslip finalized, and re-sums the run totals. No money moves here
 * — that still happens only at markPayrollPaid. Idempotent: re-entering an
 * amount just recomputes.
 *
 * @returns {Promise<{ run, payslip }>}
 */
const setVariablePayslipAmount = async (
  req,
  runId,
  payslipId,
  { amount, units = 0 } = {},
) => {
  const ownerId = req.user.effectiveOwnerId;

  const gross = roundMoney(Number(amount) || 0);
  if (!Number.isFinite(gross) || gross < 0) {
    const err = new Error('A valid pay amount (0 or more) is required');
    err.status = 400;
    throw err;
  }

  const run = await PayrollRun.findOne({ _id: runId, user: ownerId });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.status = 404;
    throw err;
  }
  if (run.status !== 'draft') {
    const err = new Error('Only a draft run can be edited');
    err.status = 400;
    throw err;
  }

  const payslip = await Payslip.findOne({
    _id: payslipId,
    payrollRun: run._id,
    user: ownerId,
  });
  if (!payslip) {
    const err = new Error('Payslip not found');
    err.status = 404;
    throw err;
  }
  if (!payslip.isVariable) {
    const err = new Error(
      'Only variable/freelance payslips have an editable amount',
    );
    err.status = 400;
    throw err;
  }

  const employee = await Employee.findOne({
    _id: payslip.employee,
    user: ownerId,
  });
  if (!employee) {
    const err = new Error('Employee not found');
    err.status = 404;
    throw err;
  }

  const user = await mongoose.model('User').findById(ownerId).select('payrollSettings');
  const settings = resolveSettings(user);

  const loan = await findActiveLoan(ownerId, employee.linkedCustomer);
  const emiToWithhold = loan
    ? Math.min(loan.emi || 0, loan.remainingAmount || 0)
    : 0;

  const data = buildPayslipData(employee, settings, emiToWithhold, {
    variableGross: gross,
    extraDeductions: payslip.deductions?.customDeductions || [],
  });

  payslip.earnings = data.earnings;
  payslip.deductions = data.deductions;
  payslip.gross = data.gross;
  payslip.totalDeductions = data.totalDeductions;
  payslip.netPay = data.netPay;
  payslip.units = Math.max(0, Number(units) || 0);
  payslip.rate = employee.payRate || 0;
  payslip.amountFinalized = true;
  await payslip.save();

  await recomputeRunTotals(run);

  await logActivity({
    userId: req.user._id,
    action: 'payroll_payslip_amount_set',
    category: 'payroll',
    details: `Set pay Rs. ${gross} for ${employee.name} (${employee.employeeId}) — ${run.month}/${run.year}`,
    metadata: { runId: run._id, payslipId: payslip._id },
    req,
  });

  return { run, payslip };
};

/**
 * Set the ad-hoc deduction line items on a payslip of a DRAFT run (advances,
 * fines, damages…). Recomputes the payslip — tax/PF/EOBI and (for fixed pay) the
 * salary structure are re-derived; for variable pay the already-entered gross is
 * preserved — folds the new deductions into the net, and re-sums the run. No
 * money moves here.
 *
 * @param {Array<{label:string, amount:number}>} deductions
 * @returns {Promise<{ run, payslip }>}
 */
const setPayslipDeductions = async (
  req,
  runId,
  payslipId,
  { deductions = [] } = {},
) => {
  const ownerId = req.user.effectiveOwnerId;

  if (!Array.isArray(deductions)) {
    const err = new Error('deductions must be a list of { label, amount }');
    err.status = 400;
    throw err;
  }

  const run = await PayrollRun.findOne({ _id: runId, user: ownerId });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.status = 404;
    throw err;
  }
  if (run.status !== 'draft') {
    const err = new Error('Deductions can only be edited on a draft run');
    err.status = 400;
    throw err;
  }

  const payslip = await Payslip.findOne({
    _id: payslipId,
    payrollRun: run._id,
    user: ownerId,
  });
  if (!payslip) {
    const err = new Error('Payslip not found');
    err.status = 404;
    throw err;
  }

  const employee = await Employee.findOne({
    _id: payslip.employee,
    user: ownerId,
  });
  if (!employee) {
    const err = new Error('Employee not found');
    err.status = 404;
    throw err;
  }

  const user = await mongoose.model('User').findById(ownerId).select('payrollSettings');
  const settings = resolveSettings(user);

  const loan = await findActiveLoan(ownerId, employee.linkedCustomer);
  const emiToWithhold = loan
    ? Math.min(loan.emi || 0, loan.remainingAmount || 0)
    : 0;

  const data = buildPayslipData(employee, settings, emiToWithhold, {
    // Keep the freelance amount the admin already entered.
    ...(payslip.isVariable ? { variableGross: payslip.gross } : {}),
    extraDeductions: deductions,
  });

  payslip.earnings = data.earnings;
  payslip.deductions = data.deductions;
  payslip.gross = data.gross;
  payslip.totalDeductions = data.totalDeductions;
  payslip.netPay = data.netPay;
  await payslip.save();

  await recomputeRunTotals(run);

  await logActivity({
    userId: req.user._id,
    action: 'payroll_payslip_deductions_set',
    category: 'payroll',
    details: `Updated deductions (Rs. ${data.deductions.otherDeductions}) for ${employee.name} (${employee.employeeId}) — ${run.month}/${run.year}`,
    metadata: { runId: run._id, payslipId: payslip._id },
    req,
  });

  return { run, payslip };
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

  // Variable/freelance payslips must have their month's pay entered first.
  const pendingVariable = await Payslip.countDocuments({
    payrollRun: run._id,
    isVariable: true,
    amountFinalized: false,
  });
  if (pendingVariable > 0) {
    const err = new Error(
      `Enter pay amounts for ${pendingVariable} variable/freelance employee(s) before approving.`,
    );
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
 *    loanRepaymentRef on the payslip. This is loan COLLECTION (the business's
 *    trade) so it stays in the business FinancialTransaction ledger;
 *  - write a PayrollTransaction for the net pay disbursed — payroll's OWN ledger,
 *    deliberately kept OUT of the business FinancialTransaction ledger so salary
 *    cost never enters the business P&L / balance sheet / reports;
 *  - flip the payslip to paid.
 *
 * Idempotent: already-paid payslips are skipped, so a retry after a partial
 * failure is safe. On any throw the whole transaction rolls back (no partial pay,
 * no leaked loan settlement, no orphan ledger row).
 *
 * NOTE (v1 scope): payroll's ledger records NET cash disbursed; the loan EMI is
 * recognised as repayment income in the business ledger (via the repayment
 * service). Statutory remittance of withheld tax/PF/EOBI as separate liabilities,
 * and gross-vs-net expense recognition, are deliberately deferred to v2.
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

        // Net cash disbursed → payroll's OWN ledger (kept out of the business
        // FinancialTransaction ledger so it never enters the business P&L).
        await PayrollTransaction.create(
          [
            {
              user: ownerId,
              branchId: payslip.branchId || employee.branchId,
              payrollRun: run._id,
              payslip: payslip._id,
              employee: employee._id,
              type: 'salary',
              amount: payslip.netPay,
              date: new Date(),
              description: `Payroll ${run.month}/${run.year} — ${employee.name} (${employee.employeeId})`,
              paymentMethod,
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

/**
 * Reopen a locked run back to DRAFT so employees can be added/updated and the
 * run regenerated. Reverses the payroll-side records:
 *  - approved (no money moved) → just flip statuses back to draft;
 *  - paid → delete this run's PayrollTransaction rows (payroll's own ledger; once
 *    back to draft, the disbursement "didn't happen") and clear paid markers.
 *
 * BLOCKED when any payslip already settled a loan EMI (loanRepaymentRef set):
 * that ran through the loan ledger and isn't safely reversible here — those
 * employees' loans would need a manual adjustment first.
 */
const reopenPayrollRun = async (req, runId) => {
  const ownerId = req.user.effectiveOwnerId;
  const run = await PayrollRun.findOne({ _id: runId, user: ownerId });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.status = 404;
    throw err;
  }
  if (run.status === 'draft') {
    const err = new Error('This run is already a draft');
    err.status = 400;
    throw err;
  }
  if (run.status === 'cancelled') {
    const err = new Error('A cancelled run cannot be reopened');
    err.status = 400;
    throw err;
  }

  const settledLoans = await Payslip.countDocuments({
    payrollRun: run._id,
    loanRepaymentRef: { $ne: null },
  });
  if (settledLoans > 0) {
    const err = new Error(
      `Cannot reopen: ${settledLoans} payslip(s) already settled a loan EMI, which can't be reversed automatically. Reverse those loan repayments first.`,
    );
    err.status = 400;
    throw err;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Drop payroll-ledger rows (only present once paid).
      await PayrollTransaction.deleteMany({ payrollRun: run._id }, { session });
      // Payslips back to draft; clear paid markers.
      await Payslip.updateMany(
        { payrollRun: run._id },
        { $set: { status: 'draft' }, $unset: { paidAt: '' } },
        { session },
      );
      run.status = 'draft';
      run.approvedBy = undefined;
      run.approvedAt = undefined;
      run.paidAt = undefined;
      await run.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await logActivity({
    userId: req.user._id,
    action: 'payroll_run_reopened',
    category: 'payroll',
    details: `Payroll run ${run.month}/${run.year} reopened to draft`,
    metadata: { runId: run._id },
    req,
  });

  return run;
};

/**
 * Delete a payroll run and everything under it (its payslips + payroll-ledger
 * rows). Allowed for draft/approved (no money moved) and for a paid run whose
 * disbursement is reversible. BLOCKED when any payslip settled a loan EMI
 * (loanRepaymentRef set) — that loan repayment lives in the business ledger and
 * isn't unwound here.
 */
const deletePayrollRun = async (req, runId) => {
  const ownerId = req.user.effectiveOwnerId;
  const run = await PayrollRun.findOne({ _id: runId, user: ownerId });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.status = 404;
    throw err;
  }

  const settledLoans = await Payslip.countDocuments({
    payrollRun: run._id,
    loanRepaymentRef: { $ne: null },
  });
  if (settledLoans > 0) {
    const err = new Error(
      `Cannot delete: ${settledLoans} payslip(s) settled a loan EMI, which can't be reversed automatically. Reverse those loan repayments first.`,
    );
    err.status = 400;
    throw err;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await PayrollTransaction.deleteMany({ payrollRun: run._id }, { session });
      await Payslip.deleteMany({ payrollRun: run._id }, { session });
      await PayrollRun.deleteOne({ _id: run._id }, { session });
    });
  } finally {
    await session.endSession();
  }

  await logActivity({
    userId: req.user._id,
    action: 'payroll_run_deleted',
    category: 'payroll',
    details: `Payroll run ${run.month}/${run.year} (${run.status}) deleted`,
    metadata: { runId: run._id, month: run.month, year: run.year },
    req,
  });

  return { _id: run._id, month: run.month, year: run.year };
};

module.exports = {
  runPayroll,
  setVariablePayslipAmount,
  setPayslipDeductions,
  recomputeRunTotals,
  approvePayrollRun,
  markPayrollPaid,
  reopenPayrollRun,
  deletePayrollRun,
  // exported for unit tests / reuse
  computeMonthlyTax,
  buildPayslipData,
  resolveSettings,
  findActiveLoan,
  DEFAULT_TAX_SLABS,
  DEFAULT_PAYROLL_SETTINGS,
};
