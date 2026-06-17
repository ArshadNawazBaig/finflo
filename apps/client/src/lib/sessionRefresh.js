import axios from 'axios';
import { BACKEND_URL, IS_NATIVE } from './constants';
import { readRefreshToken, writeRefreshToken } from './nativeRefresh';

// Silent access-token refresh against POST /api/auth/refresh.
//
// This deliberately uses its OWN bare axios instance — NOT the shared `@/lib/axios`
// instance — so the refresh call can never re-enter the auth interceptors that
// trigger it (which would recurse on a 401). It carries `withCredentials` so the
// httpOnly `refresh_token` cookie is sent, and echoes the readable `csrf_token`
// cookie in the `x-csrf-token` header to satisfy the server's double-submit check
// (see server utils/authCookies.js `verifyCsrf`). Mobile/Capacitor has no cookies
// and no stored refresh token yet, so the call 401s and the caller falls back to a
// normal logout — identical to today's behaviour (no regression).

const refreshClient = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : '/api',
  withCredentials: true,
});

// Read a non-httpOnly cookie (csrf_token) from document.cookie.
const readCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
};

// In-flight refresh, shared across every caller so a burst of 401s (many parallel
// requests racing an expired token) triggers exactly ONE network round-trip; they
// all await the same promise and receive the same fresh token.
let inFlight = null;

const doRefresh = async () => {
  const headers = {};
  const csrf = readCookie('csrf_token');
  if (csrf) headers['x-csrf-token'] = csrf;

  // Native has no cookie jar: authenticate the refresh with the stored body
  // token (read from the OS secure store). Web sends an empty body and rides the
  // httpOnly refresh cookie.
  const reqBody = {};
  if (IS_NATIVE) {
    const stored = await readRefreshToken();
    if (stored) reqBody.refreshToken = stored;
  }

  const res = await refreshClient.post('/auth/refresh', reqBody, { headers });
  // The bare client has no envelope-unwrap interceptor, so handle both the
  // enveloped ({ success, data: { token } }) and raw ({ token }) shapes.
  const body = res.data;
  const payload =
    body && body.success === true && 'data' in body ? body.data : body;
  const token = payload?.token;
  if (!token) throw new Error('Refresh response did not include a token');
  // Native: persist the ROTATED refresh token — rotation invalidated the old
  // one, so the next refresh must present this new token.
  if (IS_NATIVE && payload?.refreshToken) {
    await writeRefreshToken(payload.refreshToken);
  }
  return token;
};

/**
 * Refresh the access token, returning the new token string. Single-flight: concurrent
 * callers share one request. Rejects if the session can't be refreshed (no/expired/
 * revoked refresh token) — callers should treat a rejection as "session is dead".
 * @returns {Promise<string>}
 */
export const refreshAccessToken = () => {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
};

// Exposed for tests.
export const __readCookie = readCookie;
