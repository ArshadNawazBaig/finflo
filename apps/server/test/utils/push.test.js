/**
 * Tests for the FCM HTTP v1 push sender. Verifies it is INERT without config
 * (never sends, never throws), and — when the service-account env is present —
 * mints an access token (google-auth-library JWT is stubbed) and POSTs a
 * correctly-shaped FCM v1 message per token. No real network or Google calls.
 */
const { JWT } = require('google-auth-library');
const { sendPush, isPushConfigured } = require('../../src/utils/push');

const FCM_ENV = ['FCM_PROJECT_ID', 'FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY'];
const clearFcmEnv = () => FCM_ENV.forEach((k) => delete process.env[k]);

describe('push — unconfigured (inert)', () => {
  beforeEach(clearFcmEnv);
  afterEach(() => vi.unstubAllGlobals());

  it('reports not configured', () => {
    expect(isPushConfigured()).toBe(false);
  });

  it('does not send and returns false (no network)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await sendPush({ tokens: ['t1'], title: 'x', body: 'y' });
    expect(out).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('push — configured', () => {
  let authorizeSpy;
  beforeEach(() => {
    clearFcmEnv();
    process.env.FCM_PROJECT_ID = 'proj-123';
    process.env.FCM_CLIENT_EMAIL = 'svc@proj.iam.gserviceaccount.com';
    process.env.FCM_PRIVATE_KEY = '-----BEGIN-----\\nKEY\\n-----END-----';
    // Stub the OAuth2 token mint on the real JWT class so no Google call is made.
    authorizeSpy = vi
      .spyOn(JWT.prototype, 'authorize')
      .mockResolvedValue({ access_token: 'ACCESS123' });
  });
  afterEach(() => {
    clearFcmEnv();
    authorizeSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('reports configured', () => {
    expect(isPushConfigured()).toBe(true);
  });

  it('POSTs one correctly-shaped FCM v1 message per token', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    vi.stubGlobal('fetch', fetchSpy);

    const out = await sendPush({
      tokens: ['tokA', 'tokB'],
      title: 'Payment',
      body: 'Due tomorrow',
      data: { link: '/loans/1' },
    });

    expect(out).toEqual({ sent: 2, failed: 0 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      'https://fcm.googleapis.com/v1/projects/proj-123/messages:send',
    );
    expect(opts.headers.Authorization).toBe('Bearer ACCESS123');
    const body = JSON.parse(opts.body);
    expect(body.message.token).toBe('tokA');
    expect(body.message.notification).toEqual({
      title: 'Payment',
      body: 'Due tomorrow',
    });
    expect(body.message.data).toEqual({ link: '/loans/1' }); // stringified
  });

  it('returns {sent:0,failed:0} for an empty token list without network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await sendPush({ tokens: [], title: 'x', body: 'y' });
    expect(out).toEqual({ sent: 0, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('counts a failed (non-404) send without throwing', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    vi.stubGlobal('fetch', fetchSpy);
    const out = await sendPush({ tokens: ['t1'], title: 'x', body: 'y' });
    expect(out).toEqual({ sent: 0, failed: 1 });
  });
});
