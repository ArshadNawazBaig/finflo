/**
 * memberAuthController.loginMember — security-code → business binding, member/
 * business credential match, inactive gating, lockout, and member-type JWTs.
 */
const jwt = require('jsonwebtoken');
const Member = require('../../src/models/Member');
const { loginMember } = require('../../src/controllers/memberAuthController');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

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
