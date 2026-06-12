/**
 * Migration 0001 — money precision cleanup.
 *
 * Locks in the 2 dp-SAFE behavior. The original port rounded UP to a whole rupee
 * (`Math.ceil`), which would corrupt the platform's current 2 dp / paisa precision
 * (e.g. 945.60 → 946). This migration must instead round sub-paisa float drift to
 * 2 dp and leave any already-clean value untouched.
 */
const migration0001 = require('../../migrations/0001-precision-cleanup');
const Loan = require('../../src/models/Loan');
const { makeOwner, makeCustomer, makeLoan } = require('../helpers/factories');

// The Mongoose money setter rounds to 2 dp on assignment, so to seed a >2 dp
// "drifted" value we write it straight through the driver, bypassing setters.
const setRaw = (Model, id, fields) =>
  Model.collection.updateOne({ _id: id }, { $set: fields });

describe('migration 0001 — precision cleanup', () => {
  it('rounds sub-paisa drift to 2 dp (does NOT ceil to whole rupees)', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer);

    // 945.604999… of float drift on a money field that should be 945.60.
    await setRaw(Loan, loan._id, {
      remainingAmount: 945.60499999999,
      emi: 9456.017,
    });

    await migration0001.up();

    const fixed = await Loan.findById(loan._id);
    // Rounded to 2 dp, NOT ceiled to 946 / 9457.
    expect(fixed.remainingAmount).toBe(945.6);
    expect(fixed.emi).toBe(9456.02);
  });

  it('leaves already-clean 2 dp values untouched and is idempotent', async () => {
    const owner = await makeOwner();
    const customer = await makeCustomer(owner);
    const loan = await makeLoan(owner, customer, {
      remainingAmount: 124000,
      emi: 9456.5,
    });

    await migration0001.up();
    await migration0001.up(); // re-run: still a no-op

    const fixed = await Loan.findById(loan._id);
    expect(fixed.remainingAmount).toBe(124000);
    expect(fixed.emi).toBe(9456.5);
  });
});
