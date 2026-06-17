/**
 * Native login token delivery — `establishSession` hands a Capacitor client its
 * refresh token via `res.locals` (the response envelope folds it into the login
 * body, since native has no cookie jar), while web keeps it cookie-only.
 */
const { establishSession } = require('../../src/utils/authCookies');
const { makeOwner } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

// A req whose X-Client-Platform resolves to `platform`; carries the bits
// issueSession reads (ip / socket / user-agent) so a real session can open.
const reqFor = (platform) => ({
  get: (h) =>
    h && h.toLowerCase() === 'x-client-platform' ? platform : undefined,
  headers: {},
  socket: { remoteAddress: '203.0.113.7' },
  ip: '203.0.113.7',
});

describe('native login refresh-token delivery', () => {
  it('stashes the refresh token on res.locals (body) and withholds the access token for native', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    res.locals = {};

    const result = await establishSession(reqFor('native'), res, {
      principalId: owner._id,
      principalModel: 'User',
      tenant: owner._id,
    });

    // Null access token → the login path falls back to the legacy 1d token.
    expect(result.accessToken).toBeNull();
    // Refresh token delivered in the body (via res.locals) AND as a cookie.
    expect(res.locals.nativeRefreshToken).toBeTruthy();
    expect(res.cookies.refresh_token.value).toBeTruthy();
  });

  it('never exposes the refresh token to web — cookie only, with the short access token', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    res.locals = {};

    const result = await establishSession(reqFor(undefined), res, {
      principalId: owner._id,
      principalModel: 'User',
      tenant: owner._id,
    });

    expect(result.accessToken).toBeTruthy();
    expect(res.locals.nativeRefreshToken).toBeUndefined();
    expect(res.cookies.refresh_token.value).toBeTruthy();
  });

  it('mints the SHORT access token for native once NATIVE_SHORT_TOKENS is enabled (the flip)', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    res.locals = {};

    const prev = process.env.NATIVE_SHORT_TOKENS;
    process.env.NATIVE_SHORT_TOKENS = 'true';
    try {
      const result = await establishSession(reqFor('native'), res, {
        principalId: owner._id,
        principalModel: 'User',
        tenant: owner._id,
      });
      // Flip ON → native gets the short 15m token (no longer withheld)…
      expect(result.accessToken).toBeTruthy();
      // …and still receives the refresh token in the body for silent refresh.
      expect(res.locals.nativeRefreshToken).toBeTruthy();
    } finally {
      if (prev === undefined) delete process.env.NATIVE_SHORT_TOKENS;
      else process.env.NATIVE_SHORT_TOKENS = prev;
    }
  });
});
