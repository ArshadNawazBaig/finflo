/**
 * payrollService — payslip math, draft idempotency, approval, and the
 * money-movement markPaid step (ledger trail + loan settlement + rollback).
 */
const mongoose = require('mongoose');
const Employee = require('../../src/models/Employee');
const PayrollRun = require('../../src/models/PayrollRun');
const Payslip = require('../../src/models/Payslip');
const Loan = require('../../src/models/Loan');
const Repayment = require('../../src/models/Repayment');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const payrollService = require('../../src/services/payrollService');
const {
  makeOwner,
  makeCustomer,
  makeLoan,
  uid,
} = require('../helpers/factories');
const { ownerReq } = require('../helpers/mocks');

// markPaid opens its own transaction; pre-create the collections it writes
// transactionally so mongodb-memory-server doesn't throw `catalog changes`.
beforeAll(async () => {
  for (const M of [FinancialTransaction, Repayment, Payslip, PayrollRun]) {
    await M.createCollection().catch(() => {});
    await M.createIndexes().catch(() => {});
  }
});

const makeEmployee = (owner, overrides = {}) =>
  Employee.create({
    user: owner._id,
    name: `emp ${uid()}`,
    cnic: `${uid()}`,
    basicSalary: 50000,
    ...overrides,
  });

describe('payrollService.buildPayslipData', () => {
  it('computes gross, FBR slab tax, PF, EOBI and net via the money util', () => {
    const employee = {
      basicSalary: 100000,
      houseRentAllowance: 40000,
      medicalAllowance: 10000,
      transportAllowance: 5000,
      otherAllowances: [{ label: 'fuel', amount: 5000 }],
      providentFundEnabled: true,
      providentFundRate: 8.33,
      eobiEnabled: true,
      taxSlabType: 'slab',
    };
    const data = payrollService.buildPayslipData(
      employee,
      payrollService.DEFAULT_PAYROLL_SETTINGS,
      12000,
    );

    expect(data.gross).toBe(160000);
    // annual 1.92M → 5% on 0.6M + 15% on 0.72M = 138000/yr → 11500/mo
    expect(data.deductions.tax).toBe(11500);
    expect(data.deductions.providentFund).toBe(8330);
    expect(data.deductions.eobi).toBe(250);
    expect(data.deductions.loanEMI).toBe(12000);
    expect(data.totalDeductions).toBe(32080);
    expect(data.netPay).toBe(127920);
  });

  it('never lets deductions drive net pay negative', () => {
    const data = payrollService.buildPayslipData(
      { basicSalary: 5000, eobiEnabled: true },
      payrollService.DEFAULT_PAYROLL_SETTINGS,
      10000,
    );
    expect(data.netPay).toBe(0);
  });
});

describe('payrollService.runPayroll', () => {
  it('creates one draft payslip per active employee with correct totals', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });
    await makeEmployee(owner, { basicSalary: 30000 });
    await makeEmployee(owner, { basicSalary: 99999, status: 'terminated' });

    const { run, payslips } = await payrollService.runPayroll(ownerReq(owner), {
      month: 6,
      year: 2026,
    });

    expect(payslips).toHaveLength(2); // terminated excluded
    expect(run.status).toBe('draft');
    expect(run.employeeCount).toBe(2);
    expect(run.totalGross).toBe(80000);
  });

  it('is idempotent — re-running returns the same run, no duplicate payslips', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });

    const first = await payrollService.runPayroll(ownerReq(owner), { month: 6, year: 2026 });
    const second = await payrollService.runPayroll(ownerReq(owner), { month: 6, year: 2026 });

    expect(String(second.run._id)).toBe(String(first.run._id));
    expect(await Payslip.countDocuments({ payrollRun: first.run._id })).toBe(1);
    expect(await PayrollRun.countDocuments({ user: owner._id })).toBe(1);
  });
});

describe('payrollService.markPayrollPaid', () => {
  it('disburses net pay, writes a payroll-expense ledger row, and settles a linked loan', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      principal: 100000,
      emi: 9456,
      totalAmount: 124000,
      remainingAmount: 124000,
      interestType: 'simple',
      status: 'active',
    });
    const employee = await makeEmployee(owner, {
      basicSalary: 50000,
      linkedCustomer: customer._id,
    });

    const req = ownerReq(owner);
    await payrollService.runPayroll(req, { month: 6, year: 2026 });
    const draft = await Payslip.findOne({ employee: employee._id });
    expect(draft.deductions.loanEMI).toBe(9456); // EMI withheld
    expect(draft.netPay).toBe(40544); // 50000 - 9456, tax 0 at this band

    const run = await PayrollRun.findOne({ user: owner._id });
    await payrollService.approvePayrollRun(req, run._id);
    const paidRun = await payrollService.markPayrollPaid(req, run._id, {
      paymentMethod: 'bank',
    });

    expect(paidRun.status).toBe('paid');

    const paidSlip = await Payslip.findOne({ employee: employee._id });
    expect(paidSlip.status).toBe('paid');
    expect(paidSlip.loanRepaymentRef).toBeTruthy();

    // Loan was actually settled through the repayment service.
    const settledLoan = await Loan.findById(loan._id);
    expect(settledLoan.paidAmount).toBe(9456);
    expect(await Repayment.countDocuments({ loan: loan._id })).toBe(1);

    // Net pay booked as a payroll expense.
    const expense = await FinancialTransaction.findOne({
      user: owner._id,
      type: 'expense',
      category: 'payroll',
    });
    expect(expense).toBeTruthy();
    expect(expense.amount).toBe(40544);
  });

  it('is idempotent — re-marking a paid run does not double-pay', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });

    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 7, year: 2026 });
    await payrollService.approvePayrollRun(req, run._id);
    await payrollService.markPayrollPaid(req, run._id, {});
    await payrollService.markPayrollPaid(req, run._id, {}); // retry

    expect(
      await FinancialTransaction.countDocuments({
        user: owner._id,
        category: 'payroll',
      }),
    ).toBe(1);
  });

  it('rejects paying a run that has not been approved', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 8, year: 2026 });

    await expect(
      payrollService.markPayrollPaid(req, run._id, {}),
    ).rejects.toThrow(/approved/i);
  });
});

describe('payrollService — tenant isolation', () => {
  it("another tenant cannot approve someone else's run (404)", async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    await makeEmployee(ownerA, { basicSalary: 50000 });
    const { run } = await payrollService.runPayroll(ownerReq(ownerA), {
      month: 6,
      year: 2026,
    });

    await expect(
      payrollService.approvePayrollRun(ownerReq(ownerB), run._id),
    ).rejects.toMatchObject({ status: 404 });
  });
});
