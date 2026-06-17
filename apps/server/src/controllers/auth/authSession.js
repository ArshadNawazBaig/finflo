/**
 * Session endpoints — the public surface of the revocable-session layer:
 * silent refresh (rotation), and device/session management (list, revoke one,
 * revoke all / "log out everywhere"). Logout itself lives in authOnboarding's
 * `logoutUser`, enhanced to also revoke the refresh session + clear cookies.
 *
 * `refresh` is unauthenticated by design (the access token is expired by the
 * time it's called) — it authenticates via the refresh cookie/body token. The
 * management endpoints are gated by `protect` (a valid access token).
 */
const jwt = require('jsonwebtoken');
const {
  rotateSession,
  revokeSession,
  revokeAllForPrincipal,
  listSessions,
} = require('../../services/tokenService');
const {
  setSessionCookies,
  clearSessionCookies,
  verifyCsrf,
} = require('../../utils/authCookies');
const { logActivity } = require('../activityLogController');

const REFRESH_SECRET =
  process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

// Best-effort: which session is *this* request's, so the UI can flag "current"
// and we never let a user revoke the session they're acting from by surprise.
const currentSidFrom = (req) => {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!token) return null;
  try {
    return (
      jwt.verify(token, REFRESH_SECRET, { ignoreExpiration: true })?.sid || null
    );
  } catch {
    return null;
  }
};

/**
 * @desc   Rotate the refresh token and mint a fresh access token (silent refresh)
 * @route  POST /api/auth/refresh
 * @access Public (authenticated by the refresh cookie / body token)
 */
const refresh = async (req, res) => {
  const presented = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!presented) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }
  if (!verifyCsrf(req)) {
    return res.status(403).json({ message: 'CSRF validation failed' });
  }

  const result = await rotateSession({ refreshToken: presented, req });
  if (!result.ok) {
    // Any failure (revoked, expired, reuse) ends the web session cleanly.
    clearSessionCookies(res);
    return res.status(result.status || 401).json({ message: result.reason });
  }

  setSessionCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    csrfToken: result.csrfToken,
  });
  // Mobile/Bearer clients read the new access token from the body; web reads
  // it from the httpOnly cookie and the CSRF token from its readable cookie.
  const body = { token: result.accessToken, csrfToken: result.csrfToken };
  // A client that refreshed via a BODY token (native — no cookie jar) gets the
  // ROTATED refresh token back in the body so it can store it for the next
  // refresh. Rotation invalidates the old one, so this must round-trip.
  if (req.body?.refreshToken) body.refreshToken = result.refreshToken;
  return res.json(body);
};

// The authenticated principal — `protect` sets req.user, `protectMember` sets
// req.member. Lets the session-management endpoints serve both from one handler.
const principalOf = (req) =>
  req.user
    ? { id: req.user._id, model: 'User' }
    : { id: req.member._id, model: 'Member' };

// Real-time revocation: nudge the principal's live sockets. The payload names
// exactly what changed so a device only re-validates if ITS OWN session was
// revoked — the kept/current device (and its other tabs) do NOTHING, which
// avoids a needless refresh and the multi-tab reuse-detection storm that would
// otherwise log out the very session we meant to keep.
//   { revokedSids: [...] } — only those sessions were revoked (sign out one)
//   { keptSid }            — everything EXCEPT this was revoked (log out others)
//   {}                     — full revocation (plain logout) → everyone re-validates
// Best-effort (req.io may be absent, e.g. in tests). Sockets join
// `user_<principalId>` (see socketHandler).
const emitSessionRevoked = (req, principalId, detail = {}) => {
  try {
    req.io?.to(`user_${principalId}`).emit('session:revoked', detail);
  } catch {
    /* non-fatal */
  }
};

/**
 * @desc   List the caller's active sessions (device management)
 * @route  GET /api/auth/sessions  ·  GET /api/member-auth/sessions
 * @access Private (user or member)
 */
const getSessions = async (req, res) => {
  try {
    const { id, model } = principalOf(req);
    const currentSid = currentSidFrom(req);
    const sessions = await listSessions({
      principalId: id,
      principalModel: model,
    });
    res.json({
      sessions: sessions.map((s) => ({
        id: s._id,
        device: s.device,
        ip: s.ip,
        userAgent: s.userAgent,
        lastUsedAt: s.lastUsedAt,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        current: currentSid && s._id.toString() === currentSid,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load sessions' });
  }
};

/**
 * @desc   Revoke a specific session (sign that device out)
 * @route  DELETE /api/auth/sessions/:id
 * @access Private
 */
const deleteSession = async (req, res) => {
  try {
    const { id, model } = principalOf(req);
    const session = await revokeSession({
      sessionId: req.params.id,
      principalId: id,
      principalModel: model,
      reason: 'revoked_by_user',
    });
    // 404 (not 403) for an unowned/unknown session — don't leak existence.
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Only the device whose session this is should react (others ignore it).
    emitSessionRevoked(req, id, { revokedSids: [session._id.toString()] });
    await logActivity({
      userId: id,
      action: 'session_revoked',
      category: 'auth',
      details: `Revoked session ${session._id} (${session.device || 'unknown device'})`,
      req,
    });
    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to revoke session' });
  }
};

/**
 * @desc   Revoke every session for the caller ("log out all devices")
 * @route  POST /api/auth/logout-all
 * @access Private
 */
const logoutAll = async (req, res) => {
  try {
    const { id, model } = principalOf(req);
    const keepCurrent = req.body?.keepCurrent === true;
    const exceptSessionId = keepCurrent ? currentSidFrom(req) : undefined;
    const result = await revokeAllForPrincipal({
      principalId: id,
      principalModel: model,
      reason: 'logout_all',
      exceptSessionId,
    });
    if (!keepCurrent) clearSessionCookies(res);
    // keepCurrent → tell devices which session survived so the current device
    // (and its tabs) stay put; a full logout (no kept sid) re-validates everyone.
    emitSessionRevoked(req, id, exceptSessionId ? { keptSid: exceptSessionId } : {});

    await logActivity({
      userId: id,
      action: 'logout_all_sessions',
      category: 'auth',
      details: `Revoked ${result.modifiedCount ?? 0} session(s) across all devices`,
      req,
    });
    res.json({
      success: true,
      message: 'Signed out of all devices',
      revoked: result.modifiedCount ?? 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to sign out all devices' });
  }
};

module.exports = {
  refresh,
  getSessions,
  deleteSession,
  logoutAll,
};
