/**
 * webhookController.handleWebhook — Stripe signature verification + idempotency.
 * Uses Stripe's own generateTestHeaderString to sign real events (no mocking),
 * and an unhandled event type so the switch is a 200 no-op (no network calls).
 */
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const ProcessedWebhookEvent = require('../../src/models/ProcessedWebhookEvent');
const { handleWebhook } = require('../../src/controllers/webhookController');
const { mockRes } = require('../helpers/mocks');

const signedReq = (eventObj) => {
  const payload = JSON.stringify(eventObj);
  const sig = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  return { headers: { 'stripe-signature': sig }, body: payload };
};

describe('handleWebhook — signature verification', () => {
  it('400s on an invalid signature', async () => {
    const res = mockRes();
    await handleWebhook({ headers: { 'stripe-signature': 'bad' }, body: '{}' }, res);
    expect(res.statusCode).toBe(400);
  });

  it('accepts a correctly-signed event', async () => {
    const res = mockRes();
    await handleWebhook(signedReq({ id: 'evt_ok_1', type: 'invoice.created', data: { object: {} } }), res);
    expect(res.statusCode).toBe(200);
    expect(await ProcessedWebhookEvent.countDocuments({ eventId: 'evt_ok_1' })).toBe(1);
  });
});

describe('handleWebhook — idempotency', () => {
  it('processes an event once and skips the redelivery', async () => {
    const req = signedReq({ id: 'evt_dup_1', type: 'invoice.created', data: { object: {} } });

    const first = mockRes();
    await handleWebhook(req, first);
    expect(first.statusCode).toBe(200);

    const second = mockRes();
    await handleWebhook(req, second); // Stripe redelivers the same event id
    expect(second.body).toMatchObject({ duplicate: true });

    // The dedup row exists exactly once.
    expect(await ProcessedWebhookEvent.countDocuments({ eventId: 'evt_dup_1' })).toBe(1);
  });
});
