/** Branch schema — required fields and default flags (active, isDefault). */
const mongoose = require('mongoose');
const Branch = require('../../src/models/Branch');

const base = () => ({
  name: 'HQ',
  address: '1 Main St',
  contactNumber: '0300',
  owner: new mongoose.Types.ObjectId(),
});

describe('Branch schema', () => {
  it('validates a complete branch', () => {
    expect(new Branch(base()).validateSync()).toBeUndefined();
  });

  it('requires name, address, contactNumber and owner', () => {
    const err = new Branch({}).validateSync();
    ['name', 'address', 'contactNumber', 'owner'].forEach((f) => expect(err.errors[f]).toBeTruthy());
  });

  it('defaults isActive=true and isDefault=false', () => {
    const b = new Branch(base());
    expect(b.isActive).toBe(true);
    expect(b.isDefault).toBe(false);
  });
});
