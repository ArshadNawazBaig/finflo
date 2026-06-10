/**
 * authController.resetPassword — consumes a hashed, time-boxed reset token and
 * sets a new (policy-valid) password, then invalidates the token.
 */
const crypto = require('crypto');
const User = require('../../src/models/User');
const { resetPassword } = require('../../src/controllers/authController');
const { mockRes } = require('../helpers/mocks');
const { uid } = require('../helpers/factories');

const NEW_PASSWORD = 'NewPass1!';

// Create a user holding a reset token (the DB stores the SHA-256 hash; the raw
// token is what arrives in the reset link).
const makeResetUser = async ({ expired = false } = {}) => {
  const rawToken = crypto.randomBytes(20).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.create({
    name: 'R',
    email: `reset-${uid()}@test.com`,
    password: 'x'.repeat(20),
    role: 'admin',
    resetPasswordToken: hashed,
    resetPasswordExpire: Date.now() + (expired ? -1000 : 60 * 60 * 1000),
  });
  return { user, rawToken };
};

const resetReq = (rawToken, password) => ({
  params: { resettoken: rawToken },
  body: { password },
  ip: '127.0.0.1',
  get: () => 'test',
  headers: {},
});

describe('resetPassword', () => {
  it('resets the password with a valid token and clears the token', async () => {
    const { user, rawToken } = await makeResetUser();
    const res = mockRes();
    await resetPassword(resetReq(rawToken, NEW_PASSWORD), res);

    expect(res.statusCode).toBe(200);
    const fresh = await User.findById(user._id).select('+password');
    expect(await fresh.matchPassword(NEW_PASSWORD)).toBe(true);
    expect(fresh.resetPasswordToken).toBeUndefined();
  });

  it('400s on an invalid token', async () => {
    await makeResetUser();
    const res = mockRes();
    await resetPassword(resetReq('wrong-token', NEW_PASSWORD), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s on an expired token', async () => {
    const { rawToken } = await makeResetUser({ expired: true });
    const res = mockRes();
    await resetPassword(resetReq(rawToken, NEW_PASSWORD), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s on a weak new password', async () => {
    const { rawToken } = await makeResetUser();
    const res = mockRes();
    await resetPassword(resetReq(rawToken, 'weak'), res);
    expect(res.statusCode).toBe(400);
  });
});
