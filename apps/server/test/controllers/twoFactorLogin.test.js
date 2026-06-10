/**
 * authController.verifyLogin2FA — second step of the 2FA login: validates the
 * pending token + TOTP code against the user's secret, with per-account lockout.
 */
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const User = require('../../src/models/User');
const { verifyLogin2FA } = require('../../src/controllers/authController');
const { mockRes } = require('../helpers/mocks');
const { uid } = require('../helpers/factories');

const make2FAUser = () =>
  User.create({
    name: '2FA',
    email: `tfa-${uid()}@test.com`,
    password: 'x'.repeat(20),
    role: 'admin',
    isActive: true,
    isVerified: true,
    isTwoFactorEnabled: true,
    twoFactorSecret: authenticator.generateSecret(),
  });

const pending = (user) => jwt.sign({ id: user._id, pending2FA: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
const verifyReq = (body) => ({ body, ip: '127.0.0.1', get: () => 'test', headers: {} });

describe('verifyLogin2FA', () => {
  it('completes login with a valid pending token + correct TOTP', async () => {
    const user = await make2FAUser();
    const code = authenticator.generate(user.twoFactorSecret);
    const res = mockRes();
    await verifyLogin2FA(verifyReq({ pendingToken: pending(user), code }), res);

    expect(res.statusCode).toBe(200);
    expect(String(res.body._id)).toBe(String(user._id));
    expect(res.cookies.token).toBeTruthy();
  });

  it('401s on an invalid/expired pending token', async () => {
    const res = mockRes();
    await verifyLogin2FA(verifyReq({ pendingToken: 'garbage', code: '000000' }), res);
    expect(res.statusCode).toBe(401);
  });

  it('400s when the token lacks the pending2FA claim', async () => {
    const user = await make2FAUser();
    const wrongToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const res = mockRes();
    await verifyLogin2FA(verifyReq({ pendingToken: wrongToken, code: '000000' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s and counts the attempt on a wrong code', async () => {
    const user = await make2FAUser();
    const res = mockRes();
    await verifyLogin2FA(verifyReq({ pendingToken: pending(user), code: '000000' }), res);
    expect(res.statusCode).toBe(400);
    const fresh = await User.findById(user._id);
    expect(fresh.failedLoginAttempts).toBe(1);
  });
});
