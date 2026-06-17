/**
 * requireRecentAuth (step-up gate) — verifies the `x-step-up-token` proof that
 * guards high-risk actions. Pure middleware: mock req/res, no HTTP, no DB.
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { requireRecentAuth } = require('../../src/middleware/stepUpMiddleware');
const { mockRes } = require('../helpers/mocks');

const sign = (payload, opts = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, opts);

const reqWith = ({ user, member, headers = {}, body = {} } = {}) => ({
  user,
  member,
  headers,
  body,
});

describe('requireRecentAuth (step-up gate)', () => {
  const userId = new mongoose.Types.ObjectId();

  it('calls next() with a valid, matching step_up proof', () => {
    const token = sign({ id: userId.toString(), type: 'step_up' }, { expiresIn: '15m' });
    const req = reqWith({
      user: { _id: userId, isTwoFactorEnabled: false },
      headers: { 'x-step-up-token': token },
    });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it('challenges 403 STEP_UP_REQUIRED with factor=password when no proof is present', () => {
    const req = reqWith({ user: { _id: userId, isTwoFactorEnabled: false } });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('STEP_UP_REQUIRED');
    expect(res.body.factor).toBe('password');
  });

  it('reports factor=2fa when the account has 2FA enabled', () => {
    const req = reqWith({ user: { _id: userId, isTwoFactorEnabled: true } });
    const res = mockRes();
    requireRecentAuth()(req, res, vi.fn());
    expect(res.body.factor).toBe('2fa');
  });

  it('rejects an expired proof', () => {
    const token = sign({ id: userId.toString(), type: 'step_up' }, { expiresIn: '-1s' });
    const req = reqWith({ user: { _id: userId }, headers: { 'x-step-up-token': token } });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('rejects a proof minted for a different principal (no cross-replay)', () => {
    const token = sign(
      { id: new mongoose.Types.ObjectId().toString(), type: 'step_up' },
      { expiresIn: '15m' },
    );
    const req = reqWith({ user: { _id: userId }, headers: { 'x-step-up-token': token } });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('rejects a wrong token type (e.g. a plain access token replayed as a proof)', () => {
    const token = sign({ id: userId.toString(), type: 'user' }, { expiresIn: '15m' });
    const req = reqWith({ user: { _id: userId }, headers: { 'x-step-up-token': token } });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth()(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('serves a member principal (req.member) too', () => {
    const memberId = new mongoose.Types.ObjectId();
    const token = sign({ id: memberId.toString(), type: 'step_up' }, { expiresIn: '15m' });
    const req = reqWith({
      member: { _id: memberId, isTwoFactorEnabled: false },
      headers: { 'x-step-up-token': token },
    });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('skips the gate when the `when` predicate is false (benign edit)', () => {
    const req = reqWith({ user: { _id: userId }, body: {} });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth({ when: (r) => !!r.body.email })(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('enforces the gate when the `when` predicate is true (email change)', () => {
    const req = reqWith({
      user: { _id: userId, isTwoFactorEnabled: false },
      body: { email: 'new@x.com' },
    });
    const res = mockRes();
    const next = vi.fn();
    requireRecentAuth({ when: (r) => !!r.body.email })(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
