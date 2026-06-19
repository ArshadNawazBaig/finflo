/**
 * tokenService — the auth engine. Stateless short-lived ACCESS tokens (JWT) for
 * the hot path, backed by a stateful, REVOCABLE refresh-token layer (the
 * `Session` model) with rotation + reuse detection.
 *
 * Why hybrid: pure stateless JWT can't be revoked (no instant logout, no
 * "log out all devices", no force-logout on compromise) — disqualifying for a
 * money app. Pure server sessions cost a DB hit per request. This keeps access
 * verification stateless and pays the DB cost only at refresh time.
 *
 * Lifetimes are env-configurable so the access TTL can be cut to ~15m the
 * moment the client silent-refresh ships (Phase 2) without a code change. The
 * default keeps the legacy 1d access TTL so this layer is additive and nothing
 * logs out on deploy.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Session = require('../models/Session');

// ── Config (env-tunable) ─────────────────────────────────────────────────────
// Short-lived access token: a leaked token is valid only briefly, and the
// silent-refresh layer keeps web sessions seamless. Native business logins are
// minted with the legacy 1d token instead (they can't ride the httpOnly refresh
// cookie reliably) — see the `X-Client-Platform` gate in `utils/authCookies`.
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_ABSOLUTE_DAYS = Number(process.env.REFRESH_ABSOLUTE_DAYS || 30);
const REFRESH_ABSOLUTE_MS = REFRESH_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_IDLE_DAYS = Number(process.env.REFRESH_IDLE_DAYS || 7);
const REFRESH_IDLE_MS = REFRESH_IDLE_DAYS * 24 * 60 * 60 * 1000;
// A dedicated refresh secret limits blast radius if one secret leaks; falls
// back to JWT_SECRET so existing deployments work without new env.
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

// ── Primitives ───────────────────────────────────────────────────────────────
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

const accessTypeFor = (principalModel) =>
  principalModel === 'Member' ? 'member' : 'user';

const clientIp = (req) => {
  const raw =
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    req?.ip ||
    '';
  return raw.replace(/^::ffff:/, '');
};

// Coarse device label for the session-management UI (best-effort, no UA lib).
const parseDevice = (ua = '') => {
  if (!ua) return 'Unknown device';
  const platform = /android/i.test(ua)
    ? 'Android'
    : /iphone|ipad|ipod/i.test(ua)
      ? 'iOS'
      : /windows/i.test(ua)
        ? 'Windows'
        : /mac os/i.test(ua)
          ? 'macOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Web';
  const browser = /edg/i.test(ua)
    ? 'Edge'
    : /chrome|crios/i.test(ua)
      ? 'Chrome'
      : /firefox|fxios/i.test(ua)
        ? 'Firefox'
        : /safari/i.test(ua)
          ? 'Safari'
          : 'App';
  return `${platform} · ${browser}`;
};

// ── Signers ──────────────────────────────────────────────────────────────────
/**
 * Short-lived, stateless access token. `type` ('user'|'member') keeps the two
 * identity systems from cross-accepting tokens; `sid` ties it to a Session for
 * audit and (optional, future) per-request revocation.
 */
const signAccessToken = ({ id, type = 'user', sid }) => {
  const payload = { id: id.toString(), type };
  if (sid) payload.sid = sid.toString();
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
};

const signRefreshToken = ({ sid, jti, principalModel }) =>
  jwt.sign(
    { sid, jti, type: 'refresh', principal: accessTypeFor(principalModel) },
    REFRESH_SECRET,
    { expiresIn: `${REFRESH_ABSOLUTE_DAYS}d` },
  );

// ── Lifecycle ────────────────────────────────────────────────────────────────
/**
 * Create a brand-new login session and return the access + refresh pair.
 * Called from every login path (email, 2FA, Google, password-reset auto-login).
 */
const issueSession = async ({ principalId, principalModel, tenant, req }) => {
  const sid = new mongoose.Types.ObjectId();
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({
    sid: sid.toString(),
    jti,
    principalModel,
  });

  // Stable per-install id the client sends (X-Device-Id). Used to supersede a
  // prior session from the SAME device on re-login (one row per device).
  const deviceId = req?.get?.('X-Device-Id') || undefined;
  const userAgent = req?.get?.('user-agent');

  const session = await Session.create({
    _id: sid,
    principal: principalId,
    principalModel,
    tenant: tenant || (principalModel === 'User' ? principalId : undefined),
    currentJti: jti,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_ABSOLUTE_MS),
    lastUsedAt: new Date(),
    ip: req ? clientIp(req) : undefined,
    userAgent,
    device: parseDevice(userAgent),
    deviceId,
  });

  // One session per device: a re-login on the same device supersedes its prior
  // active session(s), so the session list shows distinct devices rather than a
  // stack of duplicate logins. Best-effort and only when a device id is known
  // (legacy/test sessions without one are never affected). The just-created
  // session is excluded.
  if (deviceId) {
    try {
      const sameDevice = [{ deviceId }];
      // Also sweep this principal's LEGACY sessions from the same browser —
      // those created before device-id tracking (deviceId absent) but with a
      // matching user-agent — so the list self-cleans on the next login instead
      // of carrying stale duplicates forever. `{ deviceId: null }` matches both
      // null and missing. Only ever hits deviceId-less (legacy) rows.
      if (userAgent) sameDevice.push({ deviceId: null, userAgent });
      await Session.updateMany(
        {
          principal: principalId,
          principalModel,
          _id: { $ne: sid },
          revokedAt: null,
          $or: sameDevice,
        },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: 'superseded_same_device',
          },
        },
      );
    } catch (err) {
      console.error('[Auth] same-device session supersede failed:', err.message);
    }
  }

  const accessToken = signAccessToken({
    id: principalId,
    type: accessTypeFor(principalModel),
    sid,
  });

  return { session, accessToken, refreshToken, csrfToken: generateCsrfToken() };
};

/**
 * Verify a refresh token, detect reuse, rotate, and mint a new pair.
 * Returns `{ ok: true, accessToken, refreshToken, csrfToken, session }` or
 * `{ ok: false, status, reason }`. Never throws on bad input.
 */
const rotateSession = async ({ refreshToken, req }) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    return { ok: false, status: 401, reason: 'Invalid or expired refresh token' };
  }
  if (payload.type !== 'refresh' || !payload.sid || !payload.jti) {
    return { ok: false, status: 401, reason: 'Malformed refresh token' };
  }

  const session = await Session.findById(payload.sid);
  if (!session) return { ok: false, status: 401, reason: 'Session not found' };
  if (session.revokedAt) {
    return { ok: false, status: 401, reason: 'Session revoked' };
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    session.revokedAt = new Date();
    session.revokedReason = 'expired';
    await session.save();
    return { ok: false, status: 401, reason: 'Session expired' };
  }
  if (Date.now() - session.lastUsedAt.getTime() > REFRESH_IDLE_MS) {
    session.revokedAt = new Date();
    session.revokedReason = 'expired';
    await session.save();
    return { ok: false, status: 401, reason: 'Session idle-expired' };
  }

  // ── Reuse detection ──
  // Only the CURRENT refresh token (latest rotation) is valid. A mismatch on
  // either the signed jti or the stored hash means an already-rotated token is
  // being replayed → token theft → nuke this session AND every sibling session
  // of the principal (defensive: assume the whole account is compromised).
  if (
    payload.jti !== session.currentJti ||
    hashToken(refreshToken) !== session.refreshTokenHash
  ) {
    session.revokedAt = new Date();
    session.revokedReason = 'reuse_detected';
    await session.save();
    await revokeAllForPrincipal({
      principalId: session.principal,
      principalModel: session.principalModel,
      reason: 'reuse_detected',
    });
    return {
      ok: false,
      status: 401,
      reason: 'Refresh token reuse detected — all sessions revoked',
      reuse: true,
    };
  }

  // ── Rotate (absolute expiry is NOT extended — that's the absolute cap) ──
  const newJti = crypto.randomUUID();
  const newRefresh = signRefreshToken({
    sid: session._id.toString(),
    jti: newJti,
    principalModel: session.principalModel,
  });
  session.currentJti = newJti;
  session.refreshTokenHash = hashToken(newRefresh);
  session.rotationCount += 1;
  session.lastUsedAt = new Date();
  if (req) {
    session.ip = clientIp(req);
    session.userAgent = req.get?.('user-agent') || session.userAgent;
  }
  await session.save();

  return {
    ok: true,
    accessToken: signAccessToken({
      id: session.principal,
      type: accessTypeFor(session.principalModel),
      sid: session._id,
    }),
    refreshToken: newRefresh,
    csrfToken: generateCsrfToken(),
    session,
  };
};

/**
 * Best-effort revoke by a presented refresh token (logout). Ignores expiry so a
 * stale token can still close its session; never throws.
 */
const revokeByRefreshToken = async (refreshToken, reason = 'logout') => {
  if (!refreshToken) return;
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET, {
      ignoreExpiration: true,
    });
    if (payload?.sid) {
      await Session.updateOne(
        { _id: payload.sid, revokedAt: null },
        { $set: { revokedAt: new Date(), revokedReason: reason } },
      );
    }
  } catch {
    /* logout is best-effort */
  }
};

/** Ownership-scoped single-session revoke (returns null if not owned → 404). */
const revokeSession = async ({
  sessionId,
  principalId,
  principalModel,
  reason = 'revoked_by_user',
}) => {
  const session = await Session.findOne({
    _id: sessionId,
    principal: principalId,
    principalModel,
    revokedAt: null,
  });
  if (!session) return null;
  session.revokedAt = new Date();
  session.revokedReason = reason;
  await session.save();
  return session;
};

/** Revoke every active session for a principal ("log out all devices"). */
const revokeAllForPrincipal = async ({
  principalId,
  principalModel,
  reason = 'logout_all',
  exceptSessionId,
}) => {
  const filter = {
    principal: principalId,
    principalModel,
    revokedAt: null,
  };
  if (exceptSessionId) filter._id = { $ne: exceptSessionId };
  return Session.updateMany(filter, {
    $set: { revokedAt: new Date(), revokedReason: reason },
  });
};

/** Active sessions for the session-management UI (newest activity first). */
const listSessions = async ({ principalId, principalModel }) =>
  Session.find({
    principal: principalId,
    principalModel,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select('ip userAgent device lastUsedAt createdAt expiresAt')
    .sort({ lastUsedAt: -1 })
    .lean();

module.exports = {
  // config (exported for the cookie helper + tests)
  ACCESS_TTL,
  REFRESH_ABSOLUTE_DAYS,
  REFRESH_ABSOLUTE_MS,
  REFRESH_IDLE_MS,
  // primitives
  hashToken,
  generateCsrfToken,
  signAccessToken,
  signRefreshToken,
  clientIp,
  parseDevice,
  // lifecycle
  issueSession,
  rotateSession,
  revokeByRefreshToken,
  revokeSession,
  revokeAllForPrincipal,
  listSessions,
};
