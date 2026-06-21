/**
 * superAdminController.updateUser — manual subscription activation. The super
 * admin grants a paid plan for a fixed duration (no Stripe); we activate it and
 * set nextBillingDate. Downgrading to Free clears the subscription, and an
 * unrelated edit must not reset an already-active expiry.
 */
const User = require('../../src/models/User');
const { updateUser } = require('../../src/controllers/superAdminController');
const { makeOwner } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const superAdminReq = (targetId, body = {}) => ({
  user: { _id: targetId, role: 'super_admin' },
  params: { id: String(targetId) },
  body,
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

const monthsFromNow = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
};

describe('updateUser — manual subscription activation', () => {
  it('activates a paid plan for the given duration and sets the expiry', async () => {
    const business = await makeOwner({ plan: 'Free' });

    const res = mockRes();
    await updateUser(
      superAdminReq(business._id, { plan: 'Pro', durationMonths: '3' }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const updated = await User.findById(business._id);
    expect(updated.plan).toBe('Pro');
    expect(updated.subscriptionStatus).toBe('active');
    expect(updated.nextBillingDate).toBeTruthy();
    // ~3 months out (allow a day of slack for month-length variance).
    const expected = monthsFromNow(3);
    const deltaDays =
      Math.abs(updated.nextBillingDate - expected) / (1000 * 60 * 60 * 24);
    expect(deltaDays).toBeLessThan(2);
  });

  it('does not reset an active expiry when no duration is supplied', async () => {
    const existingExpiry = monthsFromNow(6);
    const business = await makeOwner({
      plan: 'Pro',
      subscriptionStatus: 'active',
      nextBillingDate: existingExpiry,
    });

    const res = mockRes();
    await updateUser(
      superAdminReq(business._id, { businessName: 'Renamed Co' }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const updated = await User.findById(business._id);
    expect(updated.businessName).toBe('Renamed Co');
    expect(updated.plan).toBe('Pro');
    expect(updated.nextBillingDate.getTime()).toBe(existingExpiry.getTime());
  });

  it('clears the subscription when downgraded to Free', async () => {
    const business = await makeOwner({
      plan: 'Pro',
      subscriptionStatus: 'active',
      nextBillingDate: monthsFromNow(3),
    });

    const res = mockRes();
    await updateUser(superAdminReq(business._id, { plan: 'Free' }), res);

    expect(res.statusCode).toBe(200);
    const updated = await User.findById(business._id);
    expect(updated.plan).toBe('Free');
    expect(updated.nextBillingDate).toBeUndefined();
  });

  it('ignores an invalid duration (does not set an expiry)', async () => {
    const business = await makeOwner({ plan: 'Free' });

    const res = mockRes();
    await updateUser(
      superAdminReq(business._id, { plan: 'Pro', durationMonths: '0' }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const updated = await User.findById(business._id);
    expect(updated.plan).toBe('Pro');
    expect(updated.nextBillingDate).toBeFalsy();
  });

  it('returns 404 for a non-existent business', async () => {
    const res = mockRes();
    await updateUser(
      superAdminReq('6a3540f27aab1537369539c2', { plan: 'Pro' }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });
});
