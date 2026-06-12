/**
 * Tests for the Telnyx SMS sender. Verifies it is INERT without config (never
 * sends, never throws) and posts a correctly-shaped, E.164-normalised request
 * to Telnyx when configured. The Telnyx HTTP call is stubbed — no real network.
 */
const { sendSms, isSmsConfigured } = require('../../src/utils/sms');

const TELNYX_ENV = ['TELNYX_API_KEY', 'TELNYX_FROM_NUMBER', 'TELNYX_MESSAGING_PROFILE_ID'];
const clearTelnyxEnv = () => TELNYX_ENV.forEach((k) => delete process.env[k]);

describe('sms — unconfigured (inert)', () => {
  beforeEach(clearTelnyxEnv);

  it('reports not configured', () => {
    expect(isSmsConfigured()).toBe(false);
  });

  it('does not send and returns false', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const ok = await sendSms({ to: '03001234567', text: 'hi' });
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('sms — configured', () => {
  beforeEach(() => {
    clearTelnyxEnv();
    process.env.TELNYX_API_KEY = 'KEY123';
    process.env.TELNYX_FROM_NUMBER = '+19990001111';
  });
  afterEach(() => {
    clearTelnyxEnv();
    vi.unstubAllGlobals();
  });

  it('posts a normalised message to Telnyx and returns true', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchSpy);

    const ok = await sendSms({ to: '03001234567', text: 'Your payment is due' });
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.telnyx.com/v2/messages');
    expect(opts.headers.Authorization).toBe('Bearer KEY123');
    const body = JSON.parse(opts.body);
    expect(body.to).toBe('+923001234567'); // normalised
    expect(body.from).toBe('+19990001111');
    expect(body.text).toBe('Your payment is due');
  });

  it('returns false on a Telnyx error response (no throw)', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, text: async () => 'bad key' });
    vi.stubGlobal('fetch', fetchSpy);

    const ok = await sendSms({ to: '03001234567', text: 'hi' });
    expect(ok).toBe(false);
  });

  it('skips an unnormalisable destination', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const ok = await sendSms({ to: '+12', text: 'hi' });
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
