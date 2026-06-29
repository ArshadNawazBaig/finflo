/**
 * memberAuthController.loginMember — security-code → business binding, member/
 * business credential match, inactive gating, lockout, and member-type JWTs.
 */
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Member = require('../../src/models/Member');
const Session = require('../../src/models/Session');
const { loginMember } = require('../../src/controllers/memberAuthController');
const { makeOwner, makeMember, makeStaff } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

beforeAll(async () => {
  await Session.createCollection().catch(() => {});
  await Session.createIndexes().catch(() => {});
});

const CODE = 'SHOP01';
const PASSWORD = 'password123';

const setup = async (memberOverrides = {}) => {
  const owner = await makeOwner({ securityCode: CODE });
  const member = await makeMember(owner, {
    email: 'mem@test.com',
    password: PASSWORD,
    ...memberOverrides,
  });
  return { owner, member };
};

const loginReq = (body) => ({ body, ip: '127.0.0.1', get: () => 'test', headers: {} });

describe('loginMember', () => {
  it('400s when fields are missing', async () => {
    const res = mockRes();
    await loginMember(loginReq({ email: 'a@b.com' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('401s for an unknown business security code', async () => {
    await setup();
    const res = mockRes();
    await loginMember(loginReq({ email: 'mem@test.com', password: PASSWORD, securityCode: 'NOPE99' }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/security code/i);
  });

  it('401s when the member does not belong to that business', async () => {
    await setup();
    const other = await makeOwner({ securityCode: 'OTHER1' });
    void other;
    const res = mockRes();
    // Right member email, but wrong business code (a different tenant).
    await loginMember(loginReq({ email: 'mem@test.com', password: PASSWORD, securityCode: 'OTHER1' }), res);
    expect(res.statusCode).toBe(401);
  });

  it('resolves the admin (not a staff sharing the code) and logs the member in', async () => {
    // Staff share the owner's securityCode (staffController). The business
    // lookup must scope to role:'admin', or it can resolve a staff User and the
    // member lookup (by owner _id) misses → wrong 401 / requiresRegistration.
    // Insert the staff FIRST so an unfiltered findOne would resolve it first.
    const adminId = new mongoose.Types.ObjectId();
    await makeStaff({ _id: adminId }, { securityCode: CODE });
    const owner = await makeOwner({ _id: adminId, securityCode: CODE });
    const member = await makeMember(owner, {
      email: 'mem@test.com',
      password: PASSWORD,
    });

    const res = mockRes();
    await loginMember(
      loginReq({ email: 'mem@test.com', password: PASSWORD, securityCode: CODE }),
      res,
    );

    expect(res.statusCode).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(String(decoded.id)).toBe(String(member._id));
  });

  it('logs in a valid member with a member-type JWT', async () => {
    const { member } = await setup();
    const res = mockRes();
    await loginMember(loginReq({ email: 'mem@test.com', password: PASSWORD, securityCode: CODE }), res);

    expect(res.statusCode).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.type).toBe('member');
    expect(String(decoded.id)).toBe(String(member._id));
    expect(res.body.business).toBeTruthy();
  });

  it('mints a session-bound member token and opens a revocable Member session', async () => {
    const { member } = await setup();
    const res = mockRes();
    await loginMember(loginReq({ email: 'mem@test.com', password: PASSWORD, securityCode: CODE }), res);

    expect(res.statusCode).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.type).toBe('member');
    expect(decoded.sid).toBeTruthy(); // session-bound (refreshable 15m token)

    const session = await Session.findById(decoded.sid);
    expect(session).toBeTruthy();
    expect(session.principalModel).toBe('Member');
    expect(String(session.principal)).toBe(String(member._id));
    expect(res.cookies.refresh_token).toBeTruthy();
  });

  it('mints the legacy (non-session) token for a native member client', async () => {
    await setup();
    const res = mockRes();
    const nativeReq = {
      body: { email: 'mem@test.com', password: PASSWORD, securityCode: CODE },
      ip: '127.0.0.1',
      get: (h) => (h === 'X-Client-Platform' ? 'native' : 'test'),
      headers: {},
    };
    await loginMember(nativeReq, res);

    expect(res.statusCode).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.type).toBe('member');
    expect(decoded.sid).toBeUndefined();
  });

  it('blocks an inactive member (403)', async () => {
    await setup({ isActive: false });
    const res = mockRes();
    await loginMember(loginReq({ email: 'mem@test.com', password: PASSWORD, securityCode: CODE }), res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects a wrong password and counts the attempt', async () => {
    const { member } = await setup();
    const res = mockRes();
    await loginMember(loginReq({ email: 'mem@test.com', password: 'wrong', securityCode: CODE }), res);
    expect(res.statusCode).toBe(401);
    const fresh = await Member.findById(member._id);
    expect(fresh.failedLoginAttempts).toBe(1);
  });

  it('locks the member after repeated failures', async () => {
    await setup();
    let res;
    for (let i = 0; i < 6; i++) {
      res = mockRes();
      await loginMember(loginReq({ email: 'mem@test.com', password: 'wrong', securityCode: CODE }), res);
    }
    expect(res.statusCode).toBe(423);
    expect(res.body.locked).toBe(true);
  });
});
