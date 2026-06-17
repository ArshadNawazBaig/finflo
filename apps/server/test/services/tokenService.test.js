/**
 * tokenService — the revocable-session engine. The security-critical bits are
 * refresh-token ROTATION and REUSE DETECTION; everything else (revoke, list,
 * idle/absolute expiry, tenant isolation) is covered too. Runs against the real
 * in-memory replica set (no DB mocking).
 */
const jwt = require('jsonwebtoken');
const Session = require('../../src/models/Session');
const {
  issueSession,
  rotateSession,
  revokeByRefreshToken,
  revokeSession,
  revokeAllForPrincipal,
  listSessions,
} = require('../../src/services/tokenService');
const { makeOwner, makeMember } = require('../helpers/factories');

const fakeReq = (ua = 'Mozilla/5.0 (iPhone) Safari') => ({
  get: (h) => (h.toLowerCase() === 'user-agent' ? ua : undefined),
  headers: {},
  socket: { remoteAddress: '203.0.113.7' },
  ip: '203.0.113.7',
});

const decodeType = (accessToken) => jwt.decode(accessToken).type;

beforeAll(async () => {
  // No transaction is used here, but pre-create the collection + indexes so the
  // first write never races the TTL/unique index build.
  await Session.createCollection().catch(() => {});
  await Session.createIndexes().catch(() => {});
});

describe('issueSession', () => {
  it('creates a session and returns an access/refresh/csrf bundle', async () => {
    const owner = await makeOwner();
    const { session, accessToken, refreshToken, csrfToken } =
      await issueSession({
        principalId: owner._id,
        principalModel: 'User',
        req: fakeReq(),
      });

    expect(session.currentJti).toBeTruthy();
    expect(session.principalModel).toBe('User');
    expect(session.device).toMatch(/iOS/);
    expect(csrfToken).toHaveLength(64);
    expect(decodeType(accessToken)).toBe('user');
    // refresh is signed + carries the session id
    const rp = jwt.verify(refreshToken, process.env.JWT_SECRET);
    expect(rp.type).toBe('refresh');
    expect(rp.sid).toBe(session._id.toString());
  });

  it('maps Member principals to a member-typed access token', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const { accessToken } = await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
      req: fakeReq('okhttp/Android'),
    });
    expect(decodeType(accessToken)).toBe('member');
  });
});

describe('issueSession — one session per device', () => {
  const reqWithDevice = (deviceId) => ({
    get: (h) =>
      h === 'X-Device-Id'
        ? deviceId
        : h.toLowerCase() === 'user-agent'
          ? 'Mozilla/5.0 Safari'
          : undefined,
    headers: {},
    socket: { remoteAddress: '203.0.113.7' },
    ip: '203.0.113.7',
  });

  it('supersedes the prior session from the SAME device on re-login', async () => {
    const owner = await makeOwner();
    const first = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: reqWithDevice('device-1'),
    });
    const second = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: reqWithDevice('device-1'),
    });

    const oldRow = await Session.findById(first.session._id);
    expect(oldRow.revokedAt).toBeTruthy();
    expect(oldRow.revokedReason).toBe('superseded_same_device');
    expect((await Session.findById(second.session._id)).revokedAt).toBeFalsy();

    const active = await Session.countDocuments({
      principal: owner._id,
      revokedAt: null,
    });
    expect(active).toBe(1); // one row per device
  });

  it('keeps sessions from DIFFERENT devices', async () => {
    const owner = await makeOwner();
    const a = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: reqWithDevice('device-A'),
    });
    const b = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: reqWithDevice('device-B'),
    });
    expect((await Session.findById(a.session._id)).revokedAt).toBeFalsy();
    expect((await Session.findById(b.session._id)).revokedAt).toBeFalsy();
  });

  it('does NOT dedup when no device id is sent (legacy clients)', async () => {
    const owner = await makeOwner();
    await issueSession({ principalId: owner._id, principalModel: 'User' });
    await issueSession({ principalId: owner._id, principalModel: 'User' });
    const active = await Session.countDocuments({
      principal: owner._id,
      revokedAt: null,
    });
    expect(active).toBe(2);
  });

  it('sweeps up a LEGACY same-browser session (no device id) on the next login', async () => {
    const owner = await makeOwner();
    const uaOnly = (ua) => ({
      get: (h) => (h.toLowerCase() === 'user-agent' ? ua : undefined),
      headers: {},
      socket: { remoteAddress: '203.0.113.7' },
      ip: '203.0.113.7',
    });
    // A pre-feature session: has a user-agent but NO device id.
    const legacy = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: uaOnly('LegacyUA/1.0'),
    });
    expect(legacy.session.deviceId).toBeUndefined();

    // Next login from the same browser (same UA) now carries a device id.
    const withDevice = (ua, id) => ({
      get: (h) =>
        h === 'X-Device-Id'
          ? id
          : h.toLowerCase() === 'user-agent'
            ? ua
            : undefined,
      headers: {},
      socket: { remoteAddress: '203.0.113.7' },
      ip: '203.0.113.7',
    });
    await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: withDevice('LegacyUA/1.0', 'device-1'),
    });

    // The legacy duplicate is swept up; only the fresh session remains.
    expect((await Session.findById(legacy.session._id)).revokedAt).toBeTruthy();
    const active = await Session.countDocuments({
      principal: owner._id,
      revokedAt: null,
    });
    expect(active).toBe(1);
  });

  it('does not cross-revoke a different principal on the same device', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const u = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: reqWithDevice('shared-device'),
    });
    const m = await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
      req: reqWithDevice('shared-device'),
    });
    // Same device id, different principals → both survive.
    expect((await Session.findById(u.session._id)).revokedAt).toBeFalsy();
    expect((await Session.findById(m.session._id)).revokedAt).toBeFalsy();
  });
});

describe('rotateSession', () => {
  it('rotates: new tokens, currentJti changes, absolute expiry is NOT extended', async () => {
    const owner = await makeOwner();
    const { session, refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    const originalExpiry = session.expiresAt.getTime();

    const r = await rotateSession({ refreshToken, req: fakeReq() });
    expect(r.ok).toBe(true);
    expect(r.refreshToken).not.toBe(refreshToken);

    const fresh = await Session.findById(session._id);
    expect(fresh.currentJti).not.toBe(session.currentJti);
    expect(fresh.rotationCount).toBe(1);
    expect(fresh.expiresAt.getTime()).toBe(originalExpiry); // absolute cap holds
  });

  it('DETECTS REUSE: replaying a rotated token revokes the whole family', async () => {
    const owner = await makeOwner();
    const { session, refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    // a second, independent session for the same principal
    const second = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });

    // legitimate rotation → old token is now stale
    const r1 = await rotateSession({ refreshToken, req: fakeReq() });
    expect(r1.ok).toBe(true);

    // attacker replays the STALE token → reuse detected
    const reuse = await rotateSession({ refreshToken, req: fakeReq() });
    expect(reuse.ok).toBe(false);
    expect(reuse.reuse).toBe(true);

    // the compromised session is revoked…
    const compromised = await Session.findById(session._id);
    expect(compromised.revokedReason).toBe('reuse_detected');
    // …the freshly-rotated (previously valid) token now fails too…
    const afterNuke = await rotateSession({
      refreshToken: r1.refreshToken,
      req: fakeReq(),
    });
    expect(afterNuke.ok).toBe(false);
    // …and the sibling session was defensively revoked as well.
    const sibling = await Session.findById(second.session._id);
    expect(sibling.revokedAt).toBeTruthy();
  });

  it('rejects a revoked session', async () => {
    const owner = await makeOwner();
    const { session, refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    await Session.updateOne(
      { _id: session._id },
      { $set: { revokedAt: new Date(), revokedReason: 'logout' } },
    );
    const r = await rotateSession({ refreshToken, req: fakeReq() });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/revoked/i);
  });

  it('rejects a session past its absolute expiry', async () => {
    const owner = await makeOwner();
    const { session, refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    await Session.updateOne(
      { _id: session._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    const r = await rotateSession({ refreshToken, req: fakeReq() });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/expired/i);
  });

  it('rejects an idle-expired session', async () => {
    const owner = await makeOwner();
    const { session, refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    // 8 days idle > default 7-day idle window
    await Session.updateOne(
      { _id: session._id },
      { $set: { lastUsedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } },
    );
    const r = await rotateSession({ refreshToken, req: fakeReq() });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/idle/i);
  });

  it('rejects a garbage / wrong-secret token without throwing', async () => {
    const r = await rotateSession({ refreshToken: 'not-a-jwt', req: fakeReq() });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
  });
});

describe('revocation + listing', () => {
  it('revokeByRefreshToken closes the session', async () => {
    const owner = await makeOwner();
    const { session, refreshToken } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    await revokeByRefreshToken(refreshToken, 'logout');
    const fresh = await Session.findById(session._id);
    expect(fresh.revokedReason).toBe('logout');
  });

  it('revokeSession is ownership-scoped (other principal → null)', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const { session } = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });

    const notOwned = await revokeSession({
      sessionId: session._id,
      principalId: other._id,
      principalModel: 'User',
    });
    expect(notOwned).toBeNull();

    const owned = await revokeSession({
      sessionId: session._id,
      principalId: owner._id,
      principalModel: 'User',
    });
    expect(owned.revokedReason).toBe('revoked_by_user');
  });

  it('revokeAllForPrincipal revokes all but an optional kept session', async () => {
    const owner = await makeOwner();
    const a = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    const b = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });

    await revokeAllForPrincipal({
      principalId: owner._id,
      principalModel: 'User',
      exceptSessionId: a.session._id,
    });

    expect((await Session.findById(a.session._id)).revokedAt).toBeNull();
    expect((await Session.findById(b.session._id)).revokedAt).toBeTruthy();
  });

  it('listSessions returns only active sessions, scoped to the principal', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    const revoked = await issueSession({
      principalId: owner._id,
      principalModel: 'User',
      req: fakeReq(),
    });
    await revokeSession({
      sessionId: revoked.session._id,
      principalId: owner._id,
      principalModel: 'User',
    });
    // a member session for the same tenant must NOT show up in the user's list
    await issueSession({
      principalId: member._id,
      principalModel: 'Member',
      tenant: owner._id,
      req: fakeReq(),
    });

    const sessions = await listSessions({
      principalId: owner._id,
      principalModel: 'User',
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].device).toBeTruthy();
  });
});
