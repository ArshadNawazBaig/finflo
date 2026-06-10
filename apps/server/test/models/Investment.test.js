/** Investment (member ledger) schema — required fields, type enum, defaults. */
const mongoose = require('mongoose');
const Investment = require('../../src/models/Investment');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  member: new mongoose.Types.ObjectId(),
  type: 'deposit',
  amount: 1000,
});

describe('Investment schema', () => {
  it('validates a complete entry', () => {
    expect(new Investment(base()).validateSync()).toBeUndefined();
  });

  it('requires user, member, type and amount', () => {
    const err = new Investment({}).validateSync();
    ['user', 'member', 'type', 'amount'].forEach((f) => expect(err.errors[f]).toBeTruthy());
  });

  it('accepts loan_disbursement as a ledger type', () => {
    expect(new Investment({ ...base(), type: 'loan_disbursement' }).validateSync()).toBeUndefined();
  });

  it('rejects an unknown type', () => {
    const err = new Investment({ ...base(), type: 'gift' }).validateSync();
    expect(err.errors.type).toBeTruthy();
  });

  it('defaults accountType=current and status=Completed', () => {
    const inv = new Investment(base());
    expect(inv.accountType).toBe('current');
    expect(inv.status).toBe('Completed');
  });

  it('rejects an invalid status enum', () => {
    const err = new Investment({ ...base(), status: 'Bounced' }).validateSync();
    expect(err.errors.status).toBeTruthy();
  });
});
