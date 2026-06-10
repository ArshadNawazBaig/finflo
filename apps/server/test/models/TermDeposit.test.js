/** TermDeposit schema — required fields, duration enum and status default. */
const mongoose = require('mongoose');
const TermDeposit = require('../../src/models/TermDeposit');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  member: new mongoose.Types.ObjectId(),
  principal: 50000,
  profitRate: 12,
  duration: 12,
  maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
});

describe('TermDeposit schema', () => {
  it('validates a complete deposit', () => {
    expect(new TermDeposit(base()).validateSync()).toBeUndefined();
  });

  it('requires user, member, principal, profitRate, duration and maturityDate', () => {
    const err = new TermDeposit({}).validateSync();
    ['user', 'member', 'principal', 'profitRate', 'duration', 'maturityDate'].forEach((f) =>
      expect(err.errors[f]).toBeTruthy(),
    );
  });

  it('rejects a non-standard duration', () => {
    const err = new TermDeposit({ ...base(), duration: 7 }).validateSync();
    expect(err.errors.duration).toBeTruthy();
  });

  it('defaults status=active and sourceAccount=current', () => {
    const td = new TermDeposit(base());
    expect(td.status).toBe('active');
    expect(td.sourceAccount).toBe('current');
  });
});
