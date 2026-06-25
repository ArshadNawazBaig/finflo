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
const PayrollTransaction = require('../../src/models/PayrollTransaction');
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
  for (const M of [
    FinancialTransaction,
    PayrollTransaction,
    Repayment,
    Payslip,
    PayrollRun,
  ]) {
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

    // Net pay booked in payroll's OWN ledger, NOT the business ledger.
    const payrollTxn = await PayrollTransaction.findOne({
      user: owner._id,
      employee: employee._id,
    });
    expect(payrollTxn).toBeTruthy();
    expect(payrollTxn.amount).toBe(40544);
    expect(payrollTxn.type).toBe('salary');

    // The business FinancialTransaction ledger has NO payroll/salary expense row.
    expect(
      await FinancialTransaction.countDocuments({
        user: owner._id,
        category: 'payroll',
      }),
    ).toBe(0);
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
      await PayrollTransaction.countDocuments({ user: owner._id }),
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

describe('payrollService — variable / freelance pay', () => {
  it('seeds variable employees with a zero, un-finalized draft payslip', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { payType: 'variable', basicSalary: 0, payRate: 2000 });

    const { payslips } = await payrollService.runPayroll(ownerReq(owner), {
      month: 6,
      year: 2026,
    });

    expect(payslips).toHaveLength(1);
    expect(payslips[0].isVariable).toBe(true);
    expect(payslips[0].amountFinalized).toBe(false);
    expect(payslips[0].gross).toBe(0);
    expect(payslips[0].rate).toBe(2000);
  });

  it('setVariablePayslipAmount sets gross, finalizes, and re-sums the run', async () => {
    const owner = await makeOwner();
    const fixed = await makeEmployee(owner, { basicSalary: 40000 });
    const free = await makeEmployee(owner, { payType: 'variable', basicSalary: 0 });

    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });

    const freeSlip = await Payslip.findOne({ employee: free._id });
    const { payslip } = await payrollService.setVariablePayslipAmount(
      req,
      run._id,
      freeSlip._id,
      { amount: 25000, units: 50 },
    );

    expect(payslip.gross).toBe(25000);
    expect(payslip.amountFinalized).toBe(true);
    expect(payslip.units).toBe(50);

    const reloaded = await PayrollRun.findById(run._id);
    expect(reloaded.totalGross).toBe(65000); // 40000 fixed + 25000 freelance
    expect(reloaded.employeeCount).toBe(2);
    // sanity: untouched fixed employee unaffected
    void fixed;
  });

  it('blocks approval until every variable amount is entered, then allows it', async () => {
    const owner = await makeOwner();
    const free = await makeEmployee(owner, { payType: 'variable', basicSalary: 0 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });

    await expect(
      payrollService.approvePayrollRun(req, run._id),
    ).rejects.toMatchObject({ status: 400 });

    const slip = await Payslip.findOne({ employee: free._id });
    await payrollService.setVariablePayslipAmount(req, run._id, slip._id, {
      amount: 18000,
    });

    const approved = await payrollService.approvePayrollRun(req, run._id);
    expect(approved.status).toBe('approved');
  });

  it('preserves an entered freelance amount when the draft is re-run', async () => {
    const owner = await makeOwner();
    const free = await makeEmployee(owner, { payType: 'variable', basicSalary: 0 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });

    const slip = await Payslip.findOne({ employee: free._id });
    await payrollService.setVariablePayslipAmount(req, run._id, slip._id, {
      amount: 30000,
    });

    // Add another employee and re-run the same month.
    await makeEmployee(owner, { basicSalary: 10000 });
    await payrollService.runPayroll(req, { month: 6, year: 2026 });

    const after = await Payslip.findOne({ employee: free._id });
    expect(after.gross).toBe(30000); // not wiped back to 0
    expect(after.amountFinalized).toBe(true);
  });

  it('caps the loan EMI to what the freelance pay covers (never over-settles)', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    await makeLoan(owner, customer, {
      principal: 100000,
      emi: 9456,
      totalAmount: 124000,
      remainingAmount: 124000,
      interestType: 'simple',
      status: 'active',
    });
    const free = await makeEmployee(owner, {
      payType: 'variable',
      basicSalary: 0,
      linkedCustomer: customer._id,
    });

    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    const slip = await Payslip.findOne({ employee: free._id });

    // Pay only 5000 this month — EMI (9456) must cap at 5000, net never negative.
    const { payslip } = await payrollService.setVariablePayslipAmount(
      req,
      run._id,
      slip._id,
      { amount: 5000 },
    );

    expect(payslip.deductions.loanEMI).toBe(5000);
    expect(payslip.netPay).toBe(0);
  });
});

describe('payrollService — ad-hoc deductions', () => {
  it('adds labelled deductions, cutting net and rolling up otherDeductions', async () => {
    const owner = await makeOwner();
    const emp = await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });

    const slip = await Payslip.findOne({ employee: emp._id });
    const netBefore = slip.netPay;

    const { payslip } = await payrollService.setPayslipDeductions(
      req,
      run._id,
      slip._id,
      { deductions: [{ label: 'Salary advance', amount: 5000 }, { label: 'Fine', amount: 1000 }] },
    );

    expect(payslip.deductions.otherDeductions).toBe(6000);
    expect(payslip.deductions.customDeductions).toHaveLength(2);
    expect(payslip.netPay).toBe(netBefore - 6000);

    const reloaded = await PayrollRun.findById(run._id);
    expect(reloaded.totalNet).toBe(netBefore - 6000);
  });

  it('preserves admin-added deductions when the draft is re-run', async () => {
    const owner = await makeOwner();
    const emp = await makeEmployee(owner, { basicSalary: 40000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    const slip = await Payslip.findOne({ employee: emp._id });
    await payrollService.setPayslipDeductions(req, run._id, slip._id, {
      deductions: [{ label: 'Advance', amount: 3000 }],
    });

    await makeEmployee(owner, { basicSalary: 10000 });
    await payrollService.runPayroll(req, { month: 6, year: 2026 });

    const after = await Payslip.findOne({ employee: emp._id });
    expect(after.deductions.otherDeductions).toBe(3000);
    expect(after.netPay).toBe(37000);
  });

  it('rejects editing deductions on a non-draft run', async () => {
    const owner = await makeOwner();
    const emp = await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 9, year: 2026 });
    const slip = await Payslip.findOne({ employee: emp._id });
    await payrollService.approvePayrollRun(req, run._id);

    await expect(
      payrollService.setPayslipDeductions(req, run._id, slip._id, {
        deductions: [{ label: 'x', amount: 100 }],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('payrollService — reopen / locked re-run', () => {
  it('re-running a non-draft run throws (no silent stale return)', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    await payrollService.approvePayrollRun(req, run._id);

    await makeEmployee(owner, { basicSalary: 30000 });
    await expect(
      payrollService.runPayroll(req, { month: 6, year: 2026 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('reopen approved → draft, then re-run picks up newly added employees', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    await payrollService.approvePayrollRun(req, run._id);

    await makeEmployee(owner, { basicSalary: 30000 });
    const reopened = await payrollService.reopenPayrollRun(req, run._id);
    expect(reopened.status).toBe('draft');

    const { payslips } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    expect(payslips).toHaveLength(2); // the newly added employee is now included
  });

  it('reopen a PAID run with no loan settlement reverts it and drops payroll-ledger rows', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    await payrollService.approvePayrollRun(req, run._id);
    await payrollService.markPayrollPaid(req, run._id, {});

    expect(await PayrollTransaction.countDocuments({ user: owner._id })).toBe(1);

    const reopened = await payrollService.reopenPayrollRun(req, run._id);
    expect(reopened.status).toBe('draft');
    expect(reopened.paidAt).toBeFalsy();
    expect(await PayrollTransaction.countDocuments({ user: owner._id })).toBe(0);
    const slip = await Payslip.findOne({ payrollRun: run._id });
    expect(slip.status).toBe('draft');
  });

  it('refuses to reopen a paid run that already settled a loan EMI', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    await makeLoan(owner, customer, {
      principal: 100000,
      emi: 9456,
      totalAmount: 124000,
      remainingAmount: 124000,
      interestType: 'simple',
      status: 'active',
    });
    await makeEmployee(owner, {
      basicSalary: 50000,
      linkedCustomer: customer._id,
    });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    await payrollService.approvePayrollRun(req, run._id);
    await payrollService.markPayrollPaid(req, run._id, {});

    await expect(
      payrollService.reopenPayrollRun(req, run._id),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('payrollService — delete run', () => {
  it('deletes a draft run and all its payslips', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });

    await payrollService.deletePayrollRun(req, run._id);

    expect(await PayrollRun.countDocuments({ _id: run._id })).toBe(0);
    expect(await Payslip.countDocuments({ payrollRun: run._id })).toBe(0);
  });

  it('deletes a paid run (no loan) and drops its payroll-ledger rows', async () => {
    const owner = await makeOwner();
    await makeEmployee(owner, { basicSalary: 50000 });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    await payrollService.approvePayrollRun(req, run._id);
    await payrollService.markPayrollPaid(req, run._id, {});

    await payrollService.deletePayrollRun(req, run._id);

    expect(await PayrollRun.countDocuments({ _id: run._id })).toBe(0);
    expect(await PayrollTransaction.countDocuments({ user: owner._id })).toBe(0);
  });

  it('refuses to delete a run that settled a loan EMI', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    await makeLoan(owner, customer, {
      principal: 100000,
      emi: 9456,
      totalAmount: 124000,
      remainingAmount: 124000,
      interestType: 'simple',
      status: 'active',
    });
    await makeEmployee(owner, { basicSalary: 50000, linkedCustomer: customer._id });
    const req = ownerReq(owner);
    const { run } = await payrollService.runPayroll(req, { month: 6, year: 2026 });
    await payrollService.approvePayrollRun(req, run._id);
    await payrollService.markPayrollPaid(req, run._id, {});

    await expect(
      payrollService.deletePayrollRun(req, run._id),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("another tenant cannot delete someone else's run (404)", async () => {
    const ownerA = await makeOwner();
    const ownerB = await makeOwner();
    await makeEmployee(ownerA, { basicSalary: 50000 });
    const { run } = await payrollService.runPayroll(ownerReq(ownerA), {
      month: 6,
      year: 2026,
    });

    await expect(
      payrollService.deletePayrollRun(ownerReq(ownerB), run._id),
    ).rejects.toMatchObject({ status: 404 });
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
