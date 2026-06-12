/**
 * lateFeeService.applyLateFees — the manual/admin late-fee engine. Only charges
 * AFTER tenure + grace, never twice in the same calendar month, and tags the
 * loan with lateFeeSource='manual' so the daily cron won't stack on it.
 */
const Loan = require('../../src/models/Loan');
const FinancialTransaction = require('../../src/models/FinancialTransaction');
const { applyLateFees } = require('../../src/services/lateFeeService');
const { makeOwner, makeCustomer, makeLoan } = require('../helpers/factories');

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

const req = (owner) => ({ user: { effectiveOwnerId: owner._id } });

describe('applyLateFees', () => {
  it('charges a fixed fee on a loan past tenure + grace', async () => {
    const owner = await makeOwner({
      lateFeeEnabled: true, lateFeeType: 'fixed', lateFeeRate: 1000, lateFeeGracePeriodDays: 0,
    });
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      duration: 1, remainingAmount: 50000, startDate: monthsAgo(6),
    });

    await applyLateFees(req(owner));

    const fresh = await Loan.findById(loan._id);
    expect(fresh.lateFeeAmount).toBe(1000);
    expect(fresh.lateFeeSource).toBe('manual');
    expect(fresh.status).toBe('overdue');
    expect(fresh.remainingAmount).toBe(51000);
    expect(await FinancialTransaction.countDocuments({ loan: loan._id, category: 'late_fee' })).toBe(1);
  });

  it('charges a percentage fee based on EMI', async () => {
    const owner = await makeOwner({
      lateFeeEnabled: true, lateFeeType: 'percentage', lateFeeRate: 10, lateFeeGracePeriodDays: 0,
    });
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      duration: 1, emi: 9456, remainingAmount: 50000, startDate: monthsAgo(6),
    });

    await applyLateFees(req(owner));

    const fresh = await Loan.findById(loan._id);
    expect(fresh.lateFeeAmount).toBe(945.6); // 9456 * 10 / 100, kept to 2 dp
  });

  it('skips a loan still within its tenure', async () => {
    const owner = await makeOwner({
      lateFeeEnabled: true, lateFeeType: 'fixed', lateFeeRate: 1000,
    });
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      duration: 12, remainingAmount: 50000, startDate: new Date(),
    });

    await applyLateFees(req(owner));

    const fresh = await Loan.findById(loan._id);
    expect(fresh.lateFeeAmount).toBe(0);
  });

  it('does not charge twice in the same calendar month', async () => {
    const owner = await makeOwner({
      lateFeeEnabled: true, lateFeeType: 'fixed', lateFeeRate: 1000, lateFeeGracePeriodDays: 0,
    });
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      duration: 1, remainingAmount: 50000, startDate: monthsAgo(6),
      lateFeeAmount: 1000, lateFeeAppliedAt: new Date(), lateFeeSource: 'manual',
    });

    await applyLateFees(req(owner));

    const fresh = await Loan.findById(loan._id);
    expect(fresh.lateFeeAmount).toBe(1000); // unchanged
  });

  it('does nothing when late fees are disabled for the tenant', async () => {
    const owner = await makeOwner({ lateFeeEnabled: false });
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      duration: 1, remainingAmount: 50000, startDate: monthsAgo(6),
    });

    await applyLateFees(req(owner));

    const fresh = await Loan.findById(loan._id);
    expect(fresh.lateFeeAmount).toBe(0);
  });
});
