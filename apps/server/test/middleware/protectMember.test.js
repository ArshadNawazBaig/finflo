/**
 * memberAuthMiddleware.protectMember — member-portal JWT guard. Rejects non-member
 * token types and missing members; loads req.member on success.
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protectMember } = require('../../src/middleware/memberAuthMiddleware');
const { makeOwner, makeMember } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
const reqWith = (token, over = {}) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
  cookies: {},
  ...over,
});

describe('protectMember', () => {
  it('401s when no token is present', async () => {
    const res = mockRes();
    const next = vi.fn();
    await protectMember(reqWith(null), res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a non-member token type (e.g. a user token)', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    const next = vi.fn();
    await protectMember(reqWith(sign({ id: owner._id, type: 'user' })), res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/wrong token type/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('401s when the member does not exist', async () => {
    const res = mockRes();
    const next = vi.fn();
    await protectMember(reqWith(sign({ id: new mongoose.Types.ObjectId(), type: 'member' })), res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/member not found/i);
  });

  it('admits a valid member token and loads req.member (without password)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const req = reqWith(sign({ id: member._id, type: 'member' }));
    const res = mockRes();
    const next = vi.fn();
    await protectMember(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(String(req.member._id)).toBe(String(member._id));
    expect(req.member.password).toBeUndefined();
  });
});
