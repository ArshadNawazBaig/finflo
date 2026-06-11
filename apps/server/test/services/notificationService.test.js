/**
 * Tests for the channel-agnostic notification dispatcher. Verifies it fans out
 * to in-app + email + SMS, and that each off-app channel respects the member's
 * per-category preference and the Telnyx config gate. The Telnyx/email network
 * calls are stubbed via a fake global fetch — no real sends.
 */
const { dispatch } = require('../../src/services/notificationService');
const Notification = require('../../src/models/Notification');
const { makeOwner, makeMember } = require('../helpers/factories');

const enableTelnyx = () => {
  process.env.TELNYX_API_KEY = 'KEY';
  process.env.TELNYX_FROM_NUMBER = '+19990001111';
};
const clearTelnyx = () => {
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_FROM_NUMBER;
  delete process.env.TELNYX_MESSAGING_PROFILE_ID;
};

describe('notificationService.dispatch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '' }));
  });
  afterEach(() => {
    clearTelnyx();
    vi.unstubAllGlobals();
  });

  it('fans out to in-app + email + sms when preferences allow', async () => {
    enableTelnyx();
    const owner = await makeOwner();
    const member = await makeMember(owner);

    const results = await dispatch({
      recipientId: member._id,
      action: 'upcoming_emi_reminder', // → paymentReminders category
      title: 'Payment due',
      message: 'Your payment is due tomorrow',
      email: { html: '<p>due</p>' },
      channels: ['inApp', 'email', 'sms'],
    });

    expect(results.inApp).toBeTruthy();
    expect(results.email).toBe(true);
    expect(results.sms).toBe(true);

    const notif = await Notification.findOne({ recipient: member._id });
    expect(notif).toBeTruthy();
    expect(notif.title).toBe('Payment due');
  });

  it('skips SMS when the member disabled that SMS category', async () => {
    enableTelnyx();
    const owner = await makeOwner();
    const member = await makeMember(owner);
    member.notificationPreferences.sms.paymentReminders = false;
    await member.save();

    const results = await dispatch({
      recipientId: member._id,
      action: 'upcoming_emi_reminder',
      title: 'Payment due',
      message: 'due',
      email: { html: '<p>due</p>' },
    });
    expect(results.sms).toBe(false);
    expect(results.email).toBe(true);
  });

  it('skips email when the member disabled that email category', async () => {
    enableTelnyx();
    const owner = await makeOwner();
    const member = await makeMember(owner);
    member.notificationPreferences.email.paymentReminders = false;
    await member.save();

    const results = await dispatch({
      recipientId: member._id,
      action: 'upcoming_emi_reminder',
      title: 'x',
      message: 'y',
      email: { html: '<p>y</p>' },
    });
    expect(results.email).toBe(false);
    expect(results.sms).toBe(true);
  });

  it('does not attempt SMS when Telnyx is unconfigured', async () => {
    clearTelnyx();
    const owner = await makeOwner();
    const member = await makeMember(owner);

    const results = await dispatch({
      recipientId: member._id,
      action: 'upcoming_emi_reminder',
      title: 'x',
      message: 'y',
      channels: ['sms'],
    });
    expect(results.sms).toBe(false);
  });

  it('inApp-only channel sends neither email nor sms', async () => {
    enableTelnyx();
    const owner = await makeOwner();
    const member = await makeMember(owner);

    const results = await dispatch({
      recipientId: member._id,
      action: 'upcoming_emi_reminder',
      title: 'x',
      message: 'y',
      email: { html: '<p>y</p>' },
      channels: ['inApp'],
    });
    expect(results.email).toBe(false);
    expect(results.sms).toBe(false);
    expect(results.inApp).toBeTruthy();
  });
});
