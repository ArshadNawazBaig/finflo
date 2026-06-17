/**
 * Auth session HTTP layer — refresh (rotation + CSRF), session listing/revoke,
 * and "log out all devices". Drives the controllers directly with mock req/res.
 */
const Session = require('../../src/models/Session');
const { issueSession, rotateSession } = require('../../src/services/tokenService');
const {
  refresh,
  getSessions,
  deleteSession,
  logoutAll,
} = require('../../src/controllers/auth/authSession');
const { makeOwner, makeMember } = require('../helpers/factories');
const { ownerReq, mockRes } = require('../helpers/mocks');

const reqWith = ({
  cookies = {},
  body = {},
  headers = {},
  params = {},
  user,
  member,
  io,
} = {}) => ({
  cookies,
  body,
  params,
  user,
  member,
  io,
  headers,
  get: (h) => headers[h.toLowerCase()] ?? headers[h],
  socket: { remoteAddress: '203.0.113.7' },
  ip: '203.0.113.7',
});

beforeAll(async () => {
  await Session.createCollection().catch(() => {});
  await Session.createIndexes().catch(() => {});
});

describe('POST /auth/refresh', () => {
  it('rotates via a body token (mobile, no CSRF) and returns a new access token', async () => {
    const owner = await makeOwner();
    const { refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });

    const res = mockRes();
    await refresh(reqWith({ body: { refreshToken } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.csrfToken).toBeTruthy();
    // new cookies were set
    expect(res.cookies.refresh_token.value).toBeTruthy();
    expect(res.cookies.refresh_token.value).not.toBe(refreshToken);
  });

  it('rejects a cookie-based refresh without a matching CSRF header (403)', async () => {
    const owner = await makeOwner();
    const { refreshToken, csrfToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });

    const res = mockRes();
    await refresh(
      reqWith({ cookies: { refresh_token: refreshToken, csrf_token: csrfToken } }),
      res,
    );
    expect(res.statusCode).toBe(403);
  });

  it('accepts a cookie-based refresh with a matching CSRF header (200)', async () => {
    const owner = await makeOwner();
    const { refreshToken, csrfToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });

    const res = mockRes();
    await refresh(
      reqWith({
        cookies: { refresh_token: refreshToken, csrf_token: csrfToken },
        headers: { 'x-csrf-token': csrfToken },
      }),
      res,
    );
    expect(res.statusCode).toBe(200);
  });

  it('rejects + clears cookies on refresh-token reuse (401)', async () => {
    const owner = await makeOwner();
    const { refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });
    // rotate once so the original token is now stale
    await rotateSession({ refreshToken });

    const res = mockRes();
    await refresh(reqWith({ body: { refreshToken } }), res); // replay stale token
    expect(res.statusCode).toBe(401);
    // cookies cleared (maxAge 0)
    expect(res.cookies.refresh_token.opts.maxAge).toBe(0);
  });

  it('401s when no refresh token is presented', async () => {
    const res = mockRes();
    await refresh(reqWith({}), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns the ROTATED refresh token in the body for a native (body-token) refresh', async () => {
    const owner = await makeOwner();
    const { refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });

    const res = mockRes();
    await refresh(reqWith({ body: { refreshToken } }), res);

    expect(res.statusCode).toBe(200);
    // Native has no cookie jar — it must get the rotated token back in the body.
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it('does NOT return a body refresh token for a cookie (web) refresh', async () => {
    const owner = await makeOwner();
    const { refreshToken, csrfToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });

    const res = mockRes();
    await refresh(
      reqWith({
        cookies: { refresh_token: refreshToken, csrf_token: csrfToken },
        headers: { 'x-csrf-token': csrfToken },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    // Web rides the httpOnly cookie; the refresh token must never reach JS.
    expect(res.body.refreshToken).toBeUndefined();
  });
});

describe('session management', () => {
  it('GET /auth/sessions lists active sessions and flags the current one', async () => {
    const owner = await makeOwner();
    const { refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });
    await issueSession({ principalId: owner._id, principalModel: 'User' });

    const res = mockRes();
    await getSessions(
      ownerReq(owner, { cookies: { refresh_token: refreshToken } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions.some((s) => s.current)).toBe(true);
  });

  it('DELETE /auth/sessions/:id revokes own session; 404 for unknown', async () => {
    const owner = await makeOwner();
    const { session } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });

    const res = mockRes();
    await deleteSession(
      ownerReq(owner, { params: { id: session._id.toString() } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect((await Session.findById(session._id)).revokedAt).toBeTruthy();

    const res404 = mockRes();
    await deleteSession(
      ownerReq(owner, { params: { id: session._id.toString() } }),
      res404,
    );
    expect(res404.statusCode).toBe(404); // already revoked → not found
  });

  it('POST /auth/logout-all revokes every session for the principal', async () => {
    const owner = await makeOwner();
    await issueSession({ principalId: owner._id, principalModel: 'User' });
    await issueSession({ principalId: owner._id, principalModel: 'User' });
    await issueSession({ principalId: owner._id, principalModel: 'User' });

    const res = mockRes();
    await logoutAll(ownerReq(owner, { body: {} }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.revoked).toBe(3);

    const active = await Session.countDocuments({
      principal: owner._id,
      revokedAt: null,
    });
    expect(active).toBe(0);
  });
});

describe('member principal + socket revoke', () => {
  it('GET /sessions serves a member (req.member) too', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
    });

    const res = mockRes();
    await getSessions(reqWith({ member: { _id: member._id } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
  });

  it('DELETE /sessions/:id revokes a member session and emits session:revoked', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const { session } = await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
    });

    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) };
    const res = mockRes();
    await deleteSession(
      reqWith({ member: { _id: member._id }, params: { id: session._id.toString() }, io }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect((await Session.findById(session._id)).revokedAt).toBeTruthy();
    expect(io.to).toHaveBeenCalledWith(`user_${member._id}`);
    // Names the revoked session so only THAT device reacts (others ignore it).
    expect(emit).toHaveBeenCalledWith('session:revoked', {
      revokedSids: [session._id.toString()],
    });
  });

  it('POST /logout-all revokes a member’s sessions', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await issueSession({ principalId: member._id, principalModel: 'Member', tenant: owner._id });
    await issueSession({ principalId: member._id, principalModel: 'Member', tenant: owner._id });

    const res = mockRes();
    await logoutAll(reqWith({ member: { _id: member._id }, body: {} }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.revoked).toBe(2);
  });

  it('POST /logout-all keepCurrent keeps the current session and emits its keptSid', async () => {
    const owner = await makeOwner();
    const { refreshToken, session } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
    });
    await issueSession({ principalId: owner._id, principalModel: 'User' }); // a session to revoke

    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) };
    const res = mockRes();
    await logoutAll(
      reqWith({
        user: { _id: owner._id },
        body: { keepCurrent: true },
        cookies: { refresh_token: refreshToken },
        io,
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    // The current session must SURVIVE (this is the "log out others" bug fix).
    expect((await Session.findById(session._id)).revokedAt).toBeFalsy();
    // The emit names the kept sid so the current device ignores it (no refresh).
    expect(emit).toHaveBeenCalledWith('session:revoked', {
      keptSid: session._id.toString(),
    });
  });
});
