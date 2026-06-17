/**
 * authCookies — centralizes the httpOnly cookie transport for the web flow and
 * the CSRF double-submit check that protects the cookie-based refresh.
 *
 *  - `token`         — access JWT, httpOnly, path '/'. Read by `protect`.
 *  - `refresh_token` — refresh JWT, httpOnly, path '/api/auth' (only sent to
 *                      the auth endpoints, minimizing exposure).
 *  - `csrf_token`    — NOT httpOnly so the SPA can read it and echo it in the
 *                      `x-csrf-token` header; an attacker's cross-origin JS
 *                      cannot read it (same-origin policy), so the double-submit
 *                      can't be forged. CSRF matters here because prod runs
 *                      cross-site (Vercel ↔ Railway) with SameSite=None.
 *
 * Mobile/Capacitor uses Bearer + a body `refreshToken` instead of cookies, so
 * the CSRF check is skipped when no refresh cookie is present.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { issueSession, REFRESH_ABSOLUTE_MS } = require('../services/tokenService');

const REFRESH_SECRET =
  process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const isProd = () => process.env.NODE_ENV === 'production';

const baseCookie = () => ({
  httpOnly: true,
  secure: isProd(),
  // SameSite=None required for the cross-origin prod topology (the same value
  // the legacy `token` cookie already uses).
  sameSite: isProd() ? 'none' : 'lax',
});

/** Set access + refresh + csrf (used by the refresh endpoint after rotation). */
const setSessionCookies = (res, { accessToken, refreshToken, csrfToken }) => {
  const base = baseCookie();
  if (accessToken) {
    res.cookie('token', accessToken, {
      ...base,
      path: '/',
      maxAge: REFRESH_ABSOLUTE_MS,
    });
  }
  if (refreshToken) {
    res.cookie('refresh_token', refreshToken, {
      ...base,
      path: '/api/auth',
      maxAge: REFRESH_ABSOLUTE_MS,
    });
  }
  if (csrfToken) {
    res.cookie('csrf_token', csrfToken, {
      ...base,
      httpOnly: false,
      path: '/',
      maxAge: REFRESH_ABSOLUTE_MS,
    });
  }
};

/** Set only refresh + csrf — used at login, where the access `token` cookie is
 * already set by the existing login code (keeps this layer additive). */
const setRefreshCookies = (res, { refreshToken, csrfToken }) => {
  const base = baseCookie();
  if (refreshToken) {
    res.cookie('refresh_token', refreshToken, {
      ...base,
      path: '/api/auth',
      maxAge: REFRESH_ABSOLUTE_MS,
    });
  }
  if (csrfToken) {
    res.cookie('csrf_token', csrfToken, {
      ...base,
      httpOnly: false,
      path: '/',
      maxAge: REFRESH_ABSOLUTE_MS,
    });
  }
};

const clearSessionCookies = (res) => {
  const base = baseCookie();
  res.cookie('token', '', { ...base, path: '/', maxAge: 0 });
  res.cookie('refresh_token', '', { ...base, path: '/api/auth', maxAge: 0 });
  res.cookie('csrf_token', '', {
    ...base,
    httpOnly: false,
    path: '/',
    maxAge: 0,
  });
};

/**
 * Double-submit CSRF check. Enforced only for cookie-authenticated requests
 * (browser auto-sends the refresh cookie); Bearer/body refresh (mobile) has no
 * CSRF surface and is allowed through. Constant-time comparison.
 */
const verifyCsrf = (req) => {
  if (!req.cookies?.refresh_token) return true; // not cookie-based → no CSRF risk
  const cookie = req.cookies?.csrf_token;
  const header = req.get('x-csrf-token') || req.get('x-xsrf-token');
  if (!cookie || !header) return false;
  const a = Buffer.from(String(cookie));
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * The session id (`sid`) of the request's OWN refresh token, if any. Lets a
 * password change revoke the user's *other* sessions while keeping the current
 * one alive. Returns null when there's no refresh token (mobile/Bearer flow).
 */
const currentRefreshSid = (req) => {
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
 * Create a revocable session for a freshly-authenticated principal and set the
 * refresh + csrf cookies. Returns the session-bound **access token** (carries the
 * session `sid` and honours `ACCESS_TOKEN_TTL`) so login paths can mint short-lived
 * tokens that the silent-refresh flow understands. Best-effort: a failure here must
 * never break login, so it's wrapped and logged — callers fall back to the legacy
 * `generateToken` when this returns null.
 * @returns {Promise<{ session, csrfToken, accessToken } | null>}
 */
const establishSession = async (req, res, { principalId, principalModel, tenant }) => {
  try {
    const { session, accessToken, refreshToken, csrfToken } = await issueSession({
      principalId,
      principalModel,
      tenant,
      req,
    });
    setRefreshCookies(res, { refreshToken, csrfToken });
    const isNative = req.get?.('X-Client-Platform') === 'native';
    // Native (Capacitor) has no cookie jar for the cross-site httpOnly refresh
    // cookie, so hand it the refresh token in the LOGIN RESPONSE BODY instead.
    // Stashing it on res.locals lets the response-envelope middleware inject it
    // into the (object) success payload of EVERY login path in one place — no
    // need to touch all nine `res.json({...})` call sites and their branches.
    // Web never gets it in the body (it rides the httpOnly cookie).
    if (isNative && res?.locals) res.locals.nativeRefreshToken = refreshToken;
    // Native short-token rollout gate. OFF by default → native keeps the legacy
    // 1d access token (null here → login falls back to generateToken). Set
    // NATIVE_SHORT_TOKENS=true (per environment) once the device has the body-
    // refresh plumbing verified, and native moves to the short, revocable 15m
    // access token + silent refresh, exactly like web. One env flip to roll back.
    const nativeShortTokens = process.env.NATIVE_SHORT_TOKENS === 'true';
    const withholdAccess = isNative && !nativeShortTokens;
    return {
      session,
      csrfToken,
      accessToken: withholdAccess ? null : accessToken,
    };
  } catch (err) {
    console.error('[Auth] establishSession failed (non-fatal):', err.message);
    return null;
  }
};

module.exports = {
  setSessionCookies,
  setRefreshCookies,
  clearSessionCookies,
  verifyCsrf,
  currentRefreshSid,
  establishSession,
};
