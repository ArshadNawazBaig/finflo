/** ScheduledPayment schema — required fields, type enum and defaults. */
const mongoose = require('mongoose');
const ScheduledPayment = require('../../src/models/ScheduledPayment');

const base = () => ({
  member: new mongoose.Types.ObjectId(),
  user: new mongoose.Types.ObjectId(),
  type: 'saving_deposit',
  amount: 1000,
  dayOfMonth: 10,
  nextExecutionDate: new Date(),
});

describe('ScheduledPayment schema', () => {
  it('validates a complete schedule', () => {
    expect(new ScheduledPayment(base()).validateSync()).toBeUndefined();
  });

  it('requires member, user, type, amount, dayOfMonth and nextExecutionDate', () => {
    const err = new ScheduledPayment({}).validateSync();
    ['member', 'user', 'type', 'amount', 'dayOfMonth', 'nextExecutionDate'].forEach((f) =>
      expect(err.errors[f]).toBeTruthy(),
    );
  });

  it('rejects an unknown type', () => {
    const err = new ScheduledPayment({ ...base(), type: 'crypto_buy' }).validateSync();
    expect(err.errors.type).toBeTruthy();
  });

  it('defaults status=active and sourceAccount=current', () => {
    const s = new ScheduledPayment(base());
    expect(s.status).toBe('active');
    expect(s.sourceAccount).toBe('current');
  });
});
