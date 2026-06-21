/**
 * runSubscriptionExpiry — the daily job that downgrades lapsed manual (non-Stripe)
 * subscriptions back to Free. It must leave still-active grants, Stripe-managed
 * subscriptions, and open-ended (no expiry) grants untouched, and be idempotent.
 */
const User = require('../../src/models/User');
const Notification = require('../../src/models/Notification');
const { runSubscriptionExpiry } = require('../../src/services/jobs/paymentJobs');
const { makeOwner } = require('../helpers/factories');

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

describe('runSubscriptionExpiry', () => {
  it('downgrades a lapsed manual subscription to Free and clears the expiry', async () => {
    const business = await makeOwner({
      plan: 'Pro',
      subscriptionStatus: 'active',
      nextBillingDate: daysFromNow(-1),
    });

    await runSubscriptionExpiry();

    const updated = await User.findById(business._id);
    expect(updated.plan).toBe('Free');
    expect(updated.subscriptionStatus).toBe('canceled');
    expect(updated.nextBillingDate).toBeFalsy();

    const notif = await Notification.findOne({
      recipient: business._id,
      action: 'subscription_expired',
    });
    expect(notif).toBeTruthy();
  });

  it('leaves a still-active subscription untouched', async () => {
    const future = daysFromNow(20);
    const business = await makeOwner({
      plan: 'Pro',
      subscriptionStatus: 'active',
      nextBillingDate: future,
    });

    await runSubscriptionExpiry();

    const updated = await User.findById(business._id);
    expect(updated.plan).toBe('Pro');
    expect(updated.nextBillingDate.getTime()).toBe(future.getTime());
  });

  it('leaves Stripe-managed subscriptions untouched even when past due', async () => {
    const business = await makeOwner({
      plan: 'Pro',
      subscriptionStatus: 'active',
      stripeSubscriptionId: 'sub_123',
      nextBillingDate: daysFromNow(-5),
    });

    await runSubscriptionExpiry();

    const updated = await User.findById(business._id);
    expect(updated.plan).toBe('Pro');
  });

  it('leaves an open-ended grant (no expiry) untouched', async () => {
    const business = await makeOwner({
      plan: 'Basic',
      subscriptionStatus: 'active',
    });

    await runSubscriptionExpiry();

    const updated = await User.findById(business._id);
    expect(updated.plan).toBe('Basic');
  });

  it('is idempotent — a second run downgrades nothing new', async () => {
    const business = await makeOwner({
      plan: 'Pro',
      subscriptionStatus: 'active',
      nextBillingDate: daysFromNow(-2),
    });

    await runSubscriptionExpiry();
    await runSubscriptionExpiry();

    const notifs = await Notification.countDocuments({
      recipient: business._id,
      action: 'subscription_expired',
    });
    expect(notifs).toBe(1);
  });
});
