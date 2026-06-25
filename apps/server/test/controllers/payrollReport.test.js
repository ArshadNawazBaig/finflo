/**
 * getPayrollReport — yearly aggregation: summary totals, monthly trend,
 * deduction & department breakdown, per-employee rollup, tenant isolation.
 */
const Employee = require('../../src/models/Employee');
const PayrollRun = require('../../src/models/PayrollRun');
const Payslip = require('../../src/models/Payslip');
const { getPayrollReport } = require('../../src/controllers/payrollController');
const { makeOwner, uid } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const YEAR = 2025;

// Seed a run + one payslip per employee. Money fields go through the model's
// setters; deductions roll up to totalDeductions/netPay as the service would.
const seedRun = async (owner, { month, status, payslips }) => {
  const run = await PayrollRun.create({
    user: owner._id,
    month,
    year: YEAR,
    status,
  });
  for (const p of payslips) {
    const gross = p.gross;
    const ded = p.tax + (p.other || 0);
    await Payslip.create({
      user: owner._id,
      employee: p.employee._id,
      payrollRun: run._id,
      month,
      year: YEAR,
      status,
      earnings: { basic: gross },
      deductions: { tax: p.tax, otherDeductions: p.other || 0 },
      gross,
      totalDeductions: ded,
      netPay: gross - ded,
    });
  }
  return run;
};

const makeEmployee = (owner, overrides = {}) =>
  Employee.create({
    user: owner._id,
    name: `emp ${uid()}`,
    cnic: `${uid()}`,
    basicSalary: 50000,
    ...overrides,
  });

describe('getPayrollReport', () => {
  it('aggregates paid payslips into summary, monthly, deductions, and rollups', async () => {
    const owner = await makeOwner();
    const eng = await makeEmployee(owner, { department: 'engineering' });
    const sales = await makeEmployee(owner, { department: 'sales' });

    // Jan: both paid. Feb: only engineer paid.
    await seedRun(owner, {
      month: 1,
      status: 'paid',
      payslips: [
        { employee: eng, gross: 100000, tax: 10000, other: 2000 },
        { employee: sales, gross: 60000, tax: 5000 },
      ],
    });
    await seedRun(owner, {
      month: 2,
      status: 'paid',
      payslips: [{ employee: eng, gross: 100000, tax: 10000, other: 2000 }],
    });

    const req = ownerReq(owner, { query: { year: String(YEAR), status: 'paid' } });
    const res = mockRes();
    await getPayrollReport(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body;

    // Summary: 3 payslips, 2 runs, 2 distinct employees.
    expect(body.summary.payslipCount).toBe(3);
    expect(body.summary.runCount).toBe(2);
    expect(body.summary.employeeCount).toBe(2);
    expect(body.summary.totalGross).toBe(260000);
    // Jan eng 12k + Jan sales 5k + Feb eng 12k.
    expect(body.summary.totalDeductions).toBe(29000);

    // Monthly trend has 12 buckets; Jan net = (100000-12000)+(60000-5000).
    expect(body.monthly).toHaveLength(12);
    const jan = body.monthly[0];
    expect(jan.count).toBe(2);
    expect(jan.net).toBe(88000 + 55000);
    expect(body.monthly[2].count).toBe(0); // March empty

    // Deduction breakdown sums the tax + other lines.
    expect(body.deductionBreakdown.tax).toBe(25000);
    expect(body.deductionBreakdown.otherDeductions).toBe(4000);

    // Per-employee + department rollups present and sorted by net desc.
    expect(body.byEmployee[0].net).toBeGreaterThanOrEqual(
      body.byEmployee[1].net,
    );
    const engRow = body.byEmployee.find((e) => e.department === 'engineering');
    expect(engRow.payslips).toBe(2);
    expect(engRow.net).toBe(176000);
    expect(body.byDepartment.map((d) => d.department).sort()).toEqual([
      'engineering',
      'sales',
    ]);
    expect(body.availableYears).toContain(YEAR);
  });

  it('honours the status filter — draft payslips are excluded from paid', async () => {
    const owner = await makeOwner();
    const emp = await makeEmployee(owner);
    await seedRun(owner, {
      month: 3,
      status: 'draft',
      payslips: [{ employee: emp, gross: 70000, tax: 3000 }],
    });

    const paidReq = ownerReq(owner, { query: { year: String(YEAR), status: 'paid' } });
    const paidRes = mockRes();
    await getPayrollReport(paidReq, paidRes);
    expect(paidRes.body.summary.payslipCount).toBe(0);

    const draftReq = ownerReq(owner, { query: { year: String(YEAR), status: 'draft' } });
    const draftRes = mockRes();
    await getPayrollReport(draftReq, draftRes);
    expect(draftRes.body.summary.payslipCount).toBe(1);
    expect(draftRes.body.summary.totalNet).toBe(67000);
  });

  it('isolates tenants — another owner sees none of this payroll', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const emp = await makeEmployee(owner);
    await seedRun(owner, {
      month: 4,
      status: 'paid',
      payslips: [{ employee: emp, gross: 80000, tax: 4000 }],
    });

    const req = ownerReq(other, { query: { year: String(YEAR), status: 'paid' } });
    const res = mockRes();
    await getPayrollReport(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.payslipCount).toBe(0);
    expect(res.body.byEmployee).toHaveLength(0);
  });
});
