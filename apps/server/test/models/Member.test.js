/** Member schema — required identity fields, status/role enums and money defaults. */
const mongoose = require('mongoose');
const Member = require('../../src/models/Member');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  email: 'member@test.com',
  phone: '03001234567',
  cnic: '3520212345673',
  password: 'password123',
});

describe('Member schema', () => {
  it('validates a complete member', () => {
    expect(new Member(base()).validateSync()).toBeUndefined();
  });

  it('requires user, email, phone and cnic', () => {
    const err = new Member({}).validateSync();
    ['user', 'email', 'phone', 'cnic'].forEach((f) => expect(err.errors[f]).toBeTruthy());
  });

  it('rejects an invalid status', () => {
    const err = new Member({ ...base(), status: 'Banned' }).validateSync();
    expect(err.errors.status).toBeTruthy();
  });

  it('allows a Google-auth member without a password', () => {
    const { password, ...noPass } = base();
    expect(new Member({ ...noPass, isGoogleAuth: true }).validateSync()).toBeUndefined();
  });

  it('defaults status=Active and zeroes the money fields', () => {
    const m = new Member(base());
    expect(m.status).toBe('Active');
    expect(m.currentBalance).toBe(0);
    expect(m.totalInvested).toBe(0);
    expect(m.totalLoanProceeds).toBe(0);
    expect(m.savingBalance).toBe(0);
  });
});
