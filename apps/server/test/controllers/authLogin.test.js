/**
 * authController.loginUser — credential check, account-state gates (locked /
 * inactive / unverified / Google-only), brute-force lockout and JWT issuance.
 */
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const { loginUser } = require('../../src/controllers/authController');
const { mockRes } = require('../helpers/mocks');
const { uid } = require('../helpers/factories');

const PASSWORD = 'Secret123!';

// A verified, active admin with a known password (the model hashes on save).
const makeLoginAdmin = (overrides = {}) =>
  User.create({
    name: 'Login Admin',
    email: `login-${uid()}@test.com`,
    password: PASSWORD,
    role: 'admin',
    isActive: true,
    isVerified: true,
    ...overrides,
  });

const loginReq = (email, password) => ({
  body: { email, password },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

describe('loginUser', () => {
  it('401s for an unknown email', async () => {
    const res = mockRes();
    await loginUser(loginReq('nobody@test.com', PASSWORD), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('logs in a valid admin and returns a user-type JWT', async () => {
    const user = await makeLoginAdmin();
    const res = mockRes();
    await loginUser(loginReq(user.email, PASSWORD), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(String(decoded.id)).toBe(String(user._id));
    expect(res.body.role).toBe('admin');
    expect(res.cookies.token).toBeTruthy();
  });

  it('mints a session-bound access token (carries sid) and opens a revocable Session', async () => {
    const user = await makeLoginAdmin();
    const res = mockRes();
    await loginUser(loginReq(user.email, PASSWORD), res);

    expect(res.statusCode).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.type).toBe('user');
    // The token now comes FROM the session (carries `sid`), not the legacy 1d
    // token — this is what makes ACCESS_TOKEN_TTL=15m + silent refresh work.
    expect(decoded.sid).toBeTruthy();

    const session = await Session.findById(decoded.sid);
    expect(session).toBeTruthy();
    expect(String(session.principal)).toBe(String(user._id));
    expect(session.principalModel).toBe('User');
    // refresh + csrf cookies were set alongside the access token cookie
    expect(res.cookies.refresh_token).toBeTruthy();
    expect(res.cookies.csrf_token).toBeTruthy();
  });

  it('mints the legacy (non-session) token for a native client', async () => {
    const user = await makeLoginAdmin();
    const res = mockRes();
    // Native sends X-Client-Platform: native → establishSession returns a null
    // accessToken → login falls back to the legacy 1d token (no `sid`), since
    // native can't ride the httpOnly refresh cookie to silently refresh a 15m one.
    const nativeReq = {
      body: { email: user.email, password: PASSWORD },
      ip: '127.0.0.1',
      get: (h) => (h === 'X-Client-Platform' ? 'native' : 'test'),
      headers: {},
    };
    await loginUser(nativeReq, res);

    expect(res.statusCode).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.type).toBe('user');
    expect(decoded.sid).toBeUndefined();
  });

  it('rejects a wrong password and increments failedLoginAttempts', async () => {
    const user = await makeLoginAdmin();
    const res = mockRes();
    await loginUser(loginReq(user.email, 'wrong-password'), res);

    expect(res.statusCode).toBe(401);
    const fresh = await User.findById(user._id);
    expect(fresh.failedLoginAttempts).toBe(1);
  });

  it('locks the account (423) after 5 failed attempts', async () => {
    const user = await makeLoginAdmin();
    let res;
    for (let i = 0; i < 5; i++) {
      res = mockRes();
      await loginUser(loginReq(user.email, 'wrong'), res);
    }
    expect(res.statusCode).toBe(423);
    expect(res.body.locked).toBe(true);
    const fresh = await User.findById(user._id);
    expect(fresh.lockUntil).toBeTruthy();
  });

  it('blocks a deactivated account (403)', async () => {
    const user = await makeLoginAdmin({ isActive: false });
    const res = mockRes();
    await loginUser(loginReq(user.email, PASSWORD), res);
    expect(res.statusCode).toBe(403);
  });

  it('blocks an unverified admin (403, notVerified)', async () => {
    const user = await makeLoginAdmin({ isVerified: false });
    const res = mockRes();
    await loginUser(loginReq(user.email, PASSWORD), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.notVerified).toBe(true);
  });

  it('directs a Google-only account to use Google sign-in', async () => {
    const user = await User.create({
      name: 'G',
      email: `g-${uid()}@test.com`,
      role: 'admin',
      isActive: true,
      isVerified: true,
      isGoogleAuth: true,
      // no password
    });
    const res = mockRes();
    await loginUser(loginReq(user.email, PASSWORD), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/google/i);
  });

  it('returns a 2FA-pending token (not a full session) when 2FA is enabled', async () => {
    const user = await makeLoginAdmin({ isTwoFactorEnabled: true });
    const res = mockRes();
    await loginUser(loginReq(user.email, PASSWORD), res);

    expect(res.body.requires2FA).toBe(true);
    expect(res.body.token).toBeUndefined();
    const decoded = jwt.verify(res.body.pendingToken, process.env.JWT_SECRET);
    expect(decoded.pending2FA).toBe(true);
  });
});
