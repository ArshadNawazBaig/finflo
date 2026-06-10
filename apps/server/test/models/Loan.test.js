/**
 * Loan schema — required fields, enum guards and sensible defaults. Uses
 * validateSync()/construction so no DB round-trip is needed.
 */
const mongoose = require('mongoose');
const Loan = require('../../src/models/Loan');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  customer: new mongoose.Types.ObjectId(),
  principal: 100000,
  rate: 24,
  duration: 12,
  emi: 9456,
  totalAmount: 124000,
  startDate: new Date(),
  remainingAmount: 124000,
});

describe('Loan schema', () => {
  it('validates a complete loan', () => {
    expect(new Loan(base()).validateSync()).toBeUndefined();
  });

  it('requires the core financial fields', () => {
    const err = new Loan({}).validateSync();
    ['user', 'customer', 'principal', 'rate', 'duration', 'emi', 'totalAmount', 'startDate', 'remainingAmount'].forEach(
      (f) => expect(err.errors[f]).toBeTruthy(),
    );
  });

  it('rejects an invalid status', () => {
    const err = new Loan({ ...base(), status: 'frozen' }).validateSync();
    expect(err.errors.status).toBeTruthy();
  });

  it('rejects an invalid interestType', () => {
    const err = new Loan({ ...base(), interestType: 'flat' }).validateSync();
    expect(err.errors.interestType).toBeTruthy();
  });

  it('applies defaults: active / simple / zeroed counters', () => {
    const loan = new Loan(base());
    expect(loan.status).toBe('active');
    expect(loan.interestType).toBe('simple');
    expect(loan.paidAmount).toBe(0);
    expect(loan.lateFeeAmount).toBe(0);
    expect(loan.compoundedPeriods).toBe(0);
    expect(loan.lateFeeSource).toBe(null);
  });
});
