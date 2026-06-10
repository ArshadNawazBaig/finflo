/**
 * authMiddleware.protect — JWT verification, token-type enforcement, user load,
 * and effective-owner scoping (the backbone of tenant isolation).
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protect } = require('../../src/middleware/authMiddleware');
const { makeOwner, makeStaff } = require('../helpers/factories');
const { mockRes } = require('../helpers/mocks');

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

const reqWith = (token, over = {}) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
  cookies: {},
  path: '/api/anything',
  ip: '127.0.0.1',
  connection: {},
  ...over,
});

describe('protect', () => {
  it('401s when no token is present', async () => {
    const res = mockRes();
    const next = vi.fn();
    await protect(reqWith(null), res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('401s on a malformed/invalid token', async () => {
    const res = mockRes();
    const next = vi.fn();
    await protect(reqWith('garbage.token.here'), res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/token failed/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token whose type is not "user"', async () => {
    const owner = await makeOwner();
    const res = mockRes();
    const next = vi.fn();
    await protect(reqWith(sign({ id: owner._id, type: 'member' })), res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/wrong token type/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('401s when the user no longer exists', async () => {
    const res = mockRes();
    const next = vi.fn();
    await protect(reqWith(sign({ id: new mongoose.Types.ObjectId(), type: 'user' })), res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/user not found/i);
  });

  it('admits a valid admin and scopes effectiveOwnerId to self', async () => {
    const owner = await makeOwner();
    const req = reqWith(sign({ id: owner._id, type: 'user' }));
    const res = mockRes();
    const next = vi.fn();
    await protect(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(String(req.user._id)).toBe(String(owner._id));
    expect(String(req.user.effectiveOwnerId)).toBe(String(owner._id));
    expect(req.user.isManager).toBe(false);
  });

  it('scopes a staff member’s effectiveOwnerId to their owner', async () => {
    const owner = await makeOwner();
    const staff = await makeStaff(owner);
    const req = reqWith(sign({ id: staff._id, type: 'user' }));
    const res = mockRes();
    const next = vi.fn();
    await protect(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(String(req.user.effectiveOwnerId)).toBe(String(owner._id));
  });

  it('accepts a token via cookie when no Authorization header is present', async () => {
    const owner = await makeOwner();
    const req = reqWith(null, { cookies: { token: sign({ id: owner._id, type: 'user' }) } });
    const res = mockRes();
    const next = vi.fn();
    await protect(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
