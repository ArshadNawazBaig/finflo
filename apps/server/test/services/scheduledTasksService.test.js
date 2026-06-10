/**
 * Cron financial engine — compound-interest accrual (once per missed period, even
 * for legacy docs without compoundedPeriods) and late-fee gating against the
 * manual engine.
 */
const Loan = require('../../src/models/Loan');
const User = require('../../src/models/User');
const {
  runCompoundInterestAccrual,
  runLateFeeAccrual,
} = require('../../src/services/scheduledTasksService');
const { makeOwner, makeCustomer, makeLoan, uid } = require('../helpers/factories');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

describe('runCompoundInterestAccrual — once per missed period', () => {
  it('capitalizes ONE month for one missed installment across 30 daily cron runs', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      interestType: 'compound',
      rate: 24,
      principal: 100000,
      totalAmount: 100000,
      remainingAmount: 100000,
      paidAmount: 0,
      emi: 8500,
      startDate: daysAgo(40),
    });

    for (let day = 0; day < 30; day++) await runCompoundInterestAccrual();

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.remainingAmount).toBe(102000); // one month of 2000, not 30×
    expect(freshLoan.compoundedPeriods).toBe(1);
  });

  it('compounds a LEGACY loan with no compoundedPeriods field (CAS missing-field fix)', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      interestType: 'compound',
      rate: 24,
      principal: 100000,
      totalAmount: 100000,
      remainingAmount: 100000,
      paidAmount: 0,
      emi: 8500,
      startDate: daysAgo(40),
    });
    await Loan.collection.updateOne({ _id: loan._id }, { $unset: { compoundedPeriods: '' } });

    await runCompoundInterestAccrual();

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.remainingAmount).toBe(102000);
    expect(freshLoan.compoundedPeriods).toBe(1);
  });

  it('accrues interest on principal, NOT on accrued late fees', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      interestType: 'compound',
      rate: 24,
      principal: 100000,
      totalAmount: 120000,
      remainingAmount: 120000, // inflated by 20k of "late fees"
      outstandingPrincipal: 100000,
      paidAmount: 0,
      emi: 8500,
      startDate: daysAgo(40),
    });

    await runCompoundInterestAccrual();

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.remainingAmount).toBe(122000); // 2000 on principal, not 2400
    expect(freshLoan.outstandingPrincipal).toBe(102000);
  });
});

describe('runLateFeeAccrual — gating against the manual engine (B1)', () => {
  it('does NOT stack on a fee the manual engine already charged this month', async () => {
    const owner = await User.create({
      name: 'O',
      email: `o-${uid()}@test.com`,
      password: 'x'.repeat(20),
      role: 'admin',
      lateFeeEnabled: true,
      lateFeeType: 'fixed',
      lateFeeRate: 1000,
      lateFeeGracePeriodDays: 0,
    });
    const customer = await makeCustomer(owner);
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    const loan = await makeLoan(owner, customer, {
      duration: 1,
      remainingAmount: 50000,
      startDate: start,
      lateFeeAmount: 1000,
      lateFeeSource: 'manual',
      lateFeeAppliedAt: new Date(),
    });

    await runLateFeeAccrual();

    const freshLoan = await Loan.findById(loan._id);
    expect(freshLoan.lateFeeAmount).toBe(1000);
    expect(freshLoan.lateFeeSource).toBe('manual');
  });
});
