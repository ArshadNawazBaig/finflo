/** Customer schema — required identity fields, email validation and defaults. */
const mongoose = require('mongoose');
const Customer = require('../../src/models/Customer');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  name: 'Jane Doe',
  email: 'jane@test.com',
  phone: '03001234567',
  cnic: '3520212345673',
});

describe('Customer schema', () => {
  it('validates a complete customer', () => {
    expect(new Customer(base()).validateSync()).toBeUndefined();
  });

  it('requires user, name, email, phone and cnic', () => {
    const err = new Customer({}).validateSync();
    ['user', 'name', 'email', 'phone', 'cnic'].forEach((f) => expect(err.errors[f]).toBeTruthy());
  });

  it('rejects a malformed email', () => {
    const err = new Customer({ ...base(), email: 'not-an-email' }).validateSync();
    expect(err.errors.email).toBeTruthy();
  });

  it('defaults status=Active and isMember=false', () => {
    const c = new Customer(base());
    expect(c.status).toBe('Active');
    expect(c.isMember).toBe(false);
  });
});
