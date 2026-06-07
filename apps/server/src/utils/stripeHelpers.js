// Stripe moved `current_period_end` from the subscription object to the
// subscription *item* in recent API versions, so `subscription.current_period_end`
// is now often undefined → `new Date(undefined * 1000)` → Invalid Date, which
// throws a Mongoose CastError when written to a Date field.
//
// Read the period end from the item first, fall back to the legacy
// subscription-level field, and return null for missing/invalid values so
// callers never persist an Invalid Date.
const getSubscriptionPeriodEnd = (subscription) => {
  const ts =
    subscription?.items?.data?.[0]?.current_period_end ??
    subscription?.current_period_end;
  if (!ts) return null;
  const date = new Date(ts * 1000);
  return Number.isNaN(date.valueOf()) ? null : date;
};

module.exports = { getSubscriptionPeriodEnd };
