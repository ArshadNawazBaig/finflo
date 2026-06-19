/**
 * POST /api/auth/reauth (+ /member-auth/reauth) — step-up re-authentication.
 * Adaptive factor: a TOTP code when 2FA is enabled, otherwise the account
 * password. Drives the controller directly with mock req/res.
 */
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const { reauth } = require('../../src/controllers/auth/stepUp');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const userReq = (user, body = {}) => ({
  user: { _id: user._id },
  body,
  headers: {},
  get: () => 'test',
  ip: '127.0.0.1',
});
const memberReqOf = (member, body = {}) => ({
  member: { _id: member._id },
  body,
  headers: {},
  get: () => 'test',
  ip: '127.0.0.1',
});

// A code guaranteed to differ from the valid one (flip the first digit).
const wrongCode = (secret) => {
  const real = authenticator.generate(secret);
  return (real[0] === '0' ? '1' : '0') + real.slice(1);
};

describe('step-up reauth — password factor', () => {
  it('mints a step_up proof for the correct password (user)', async () => {
    const owner = await makeOwner(); // password = 'x'.repeat(20)
    const res = mockRes();
    await reauth(userReq(owner, { password: 'x'.repeat(20) }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.expiresIn).toBe(900);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.type).toBe('step_up');
    expect(decoded.id).toBe(owner._id.toString());
  });

  it('422s on an incorrect password (NOT 401 — must not look like an expired session)', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await reauth(userReq(owner, { password: 'definitely-wrong' }), res);
    expect(res.statusCode).toBe(422);
  });

  it('400s when no password is supplied', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    await reauth(userReq(owner, {}), res);
    expect(res.statusCode).toBe(400);
  });

  it('serves a member principal', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner); // password 'password123'
    const res = mockRes();
    await reauth(memberReqOf(member, { password: 'password123' }), res);

    expect(res.statusCode).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(member._id.toString());
  });
});

describe('step-up reauth — 2FA factor', () => {
  it('mints a proof for a valid TOTP code', async () => {
    const secret = authenticator.generateSecret();
    const owner = await makeOwner({ isTwoFactorEnabled: true, twoFactorSecret: secret });
    const res = mockRes();
    await reauth(userReq(owner, { code: authenticator.generate(secret) }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('422s on an invalid TOTP code', async () => {
    const secret = authenticator.generateSecret();
    const owner = await makeOwner({ isTwoFactorEnabled: true, twoFactorSecret: secret });
    const res = mockRes();
    await reauth(userReq(owner, { code: wrongCode(secret) }), res);
    expect(res.statusCode).toBe(422);
  });

  it('400s when 2FA is on but no code is provided (a password is not accepted)', async () => {
    const secret = authenticator.generateSecret();
    const owner = await makeOwner({ isTwoFactorEnabled: true, twoFactorSecret: secret });
    const res = mockRes();
    await reauth(userReq(owner, { password: 'x'.repeat(20) }), res);
    expect(res.statusCode).toBe(400);
  });
});
