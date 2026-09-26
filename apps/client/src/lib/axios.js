import axios from 'axios';
import { getDefaultStore } from 'jotai';
import { memberAtom, userAtom, isRedirectingAtom } from '@/atoms';
import { isTokenExpired, decodeJwt } from './jwt';
import { refreshAccessToken } from './sessionRefresh';
import { getStepUpToken, requestStepUp, clearStepUpToken } from './stepUp';
import { writeRefreshToken, clearRefreshToken } from './nativeRefresh';
import { getDeviceId } from './deviceId';
import { prepareDirectUploads } from './directUploads';

// Determine the API base URL based on the environment.
import { BACKEND_URL, IS_NATIVE } from './constants';

// On native (Capacitor) the API base MUST be an ABSOLUTE, same-origin URL — the
// WebView's own origin, which is the configured `server.url`. A relative "/api"
// base makes CapacitorHttp's patched XMLHttpRequest mis-classify the request and
// throw "Failed to execute 'setRequestHeader' … the object's state must be
// OPENED" (it broke native Google login on the staging build, which ships without
// VITE_BACKEND_URL → relative base). Prod sets VITE_BACKEND_URL to an absolute URL
// and already worked; web keeps the relative base (no XHR shim in the browser).
const apiBaseUrl = BACKEND_URL
  ? `${BACKEND_URL}/api`
  : IS_NATIVE && typeof window !== 'undefined'
    ? `${window.location.origin}/api`
    : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// Registered first so Axios runs authentication before signing any uploads.
api.interceptors.request.use((config) =>
  import.meta.env.VITE_DIRECT_UPLOADS === 'true' ? prepareDirectUploads(config, api) : config,
);

// The server wraps every /api response in a standard envelope
// ({ success: true, data: <payload> }). Unwrap it so existing callers keep
// reading `res.data` / `res.data.data` unchanged. Non-enveloped responses
// (e.g. /api/health, or anything already raw) pass through untouched. Error
// envelopes ({ success: false, message }) are left raw so `error.response.data
// .message` keeps working.
export const unwrapEnvelope = (data) =>
  data && typeof data === 'object' && data.success === true && 'data' in data
    ? data.data
    : data;

// Read token directly from Jotai in-memory store (avoids localStorage timing issues)
const getToken = (isMemberRoute) => {
  const store = getDefaultStore();
  const user = store.get(userAtom);
  const member = store.get(memberAtom);
  return isMemberRoute
    ? member?.token || user?.token
    : user?.token || member?.token;
};

// After a silent refresh, persist the new access token onto the matching cached
// principal so subsequent requests pick it up. The token's `type` claim
// (user/member) decides which atom to update, so a member refresh never clobbers
// a user session and vice-versa.
const applyNewToken = (token) => {
  const store = getDefaultStore();
  const isMember = decodeJwt(token)?.type === 'member';
  const targetAtom = isMember ? memberAtom : userAtom;
  const prev = store.get(targetAtom);
  if (prev) store.set(targetAtom, { ...prev, token });
};

const authSegments = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/force-password-change',
  '/verify-email',
  '/join',
];

const isOnAuthPage = (path) => authSegments.some((seg) => path.includes(seg));

// Money-mutating endpoints that the server dedupes via the Idempotency-Key
// header (see middleware/idempotency.js). We tag each such POST with a fresh
// UUID so a retried/duplicated request moves money exactly once. Matched on the
// request URL so no per-form wiring is needed.
const MONEY_POST_PATTERNS = [
  /\/external-transfers\/?$/,
  /\/saving-goals\/.+\/contribute$/,
  /\/checkbooks\/issue$/,
  /\/repayments\/?$/,
  /\/repayments\/member\/.+\/repay$/,
  /\/members\/[^/]+\/(invest|withdraw|share-invest|share-withdraw)$/,
  /\/members\/(distribute-profit|distribute-share-profit|admin\/transfer)$/,
  /\/members\/portal\/(transfer|raast-deposit)$/,
];

const newIdempotencyKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const tagIdempotency = (config) => {
  if ((config.method || '').toLowerCase() !== 'post') return;
  const url = config.url || '';
  // Don't overwrite an existing key: if a money POST is retried after a silent
  // refresh, it must keep the SAME Idempotency-Key so the server dedupes it.
  if (
    MONEY_POST_PATTERNS.some((re) => re.test(url)) &&
    !config.headers['Idempotency-Key']
  ) {
    config.headers['Idempotency-Key'] = newIdempotencyKey();
  }
};

// Centralised "session is dead, send the user to login" handler.
// Sets a global redirecting flag so the ErrorBoundary stays silent and any
// component reading session atoms can render a minimal placeholder instead
// of crashing on `undefined`.
const handleExpiredSession = (isMemberRoute) => {
  const store = getDefaultStore();
  if (store.get(isRedirectingAtom)) return;
  store.set(isRedirectingAtom, true);
  // The step-up proof is meaningless once the session is gone — drop it so a
  // later, different login can't inherit a stale elevation.
  clearStepUpToken();
  // Native: drop the stored refresh token from the secure enclave too.
  clearRefreshToken();
  if (isMemberRoute) {
    store.set(memberAtom, null);
  } else {
    store.set(userAtom, null);
  }
  // Defer the navigation as a fallback. Route guards will redirect via
  // <Navigate> once the atom is null — if that already landed us on a
  // login page, skip the hard reload so we don't bounce the browser.
  const target = isMemberRoute ? '/member/login' : '/login';
  setTimeout(() => {
    if (isOnAuthPage(window.location.pathname)) return;
    window.location.href = target;
  }, 50);
};

// Finalise an authenticated request's headers (auth bearer + step-up proof) and
// idempotency tag, then return the config. Split out so the interceptor can hand
// the config back SYNCHRONOUSLY on the common path, or after an awaited refresh.
const finalizeAuthedConfig = (config, token) => {
  if (token && typeof token === 'string') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Attach a still-valid step-up proof so high-risk routes (transfers,
  // withdrawals, distributions, email change, account deletion) clear the
  // `requireRecentAuth` gate without re-prompting within the 15-min window.
  const stepUpToken = getStepUpToken();
  if (stepUpToken) config.headers['x-step-up-token'] = stepUpToken;
  tagIdempotency(config);
  return config;
};

api.interceptors.request.use(
  // IMPORTANT: this interceptor stays SYNCHRONOUS on every path except an actual
  // token refresh. An `async` interceptor returns a Promise for *every* request,
  // and the native CapacitorHttp XHR shim breaks across that promise boundary
  // between open() and setRequestHeader() — the login POST threw
  // "setRequestHeader … state must be OPENED". Returning a plain config object on
  // the common path keeps native requests working; only the expired-token branch
  // (which must await the refresh) returns a Promise.
  (config) => {
    // Tell the server this is a native (Capacitor) client, so login mints the
    // legacy long-lived access token instead of the short session token native
    // can't silently refresh. Sent on every request (incl. login/auth pages).
    if (IS_NATIVE) config.headers['X-Client-Platform'] = 'native';
    // Stable per-device id so a re-login on this device supersedes its prior
    // session (one row per device in Active Sessions). Sent on every request,
    // including login on auth pages (before the early return below).
    config.headers['X-Device-Id'] = getDeviceId();

    const currentPath = window.location.pathname;
    const isMemberRoute = currentPath.startsWith('/member/');

    // Auth pages may legitimately fire requests without a token (login,
    // register, reset-password). Let them through untouched.
    if (isOnAuthPage(currentPath)) {
      const token = getToken(isMemberRoute);
      if (token && typeof token === 'string') {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }

    const token = getToken(isMemberRoute);

    // If we *have* a token but it's expired, try a silent refresh BEFORE firing
    // the request — the refresh rotates the httpOnly refresh cookie and mints a
    // fresh access token. This is the ONLY branch that returns a Promise. Only if
    // the refresh fails (no/expired/revoked session) do we end the session. A
    // missing token is fine to send — the endpoint might be public
    // (`/public/stats`, `/health`, etc.); if it isn't, the server returns 401 and
    // the response interceptor takes over.
    if (token && isTokenExpired(token)) {
      return refreshAccessToken()
        .then((fresh) => {
          applyNewToken(fresh);
          return finalizeAuthedConfig(config, fresh);
        })
        .catch(() => {
          handleExpiredSession(isMemberRoute);
          return new Promise(() => {});
        });
    }

    return finalizeAuthedConfig(config, token);
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    response.data = unwrapEnvelope(response.data);
    // Native login: the response body carries the refresh token (no cookie jar).
    // Capture it into the OS secure store. Best-effort, fire-and-forget. Web
    // never receives it in the body, so this is a no-op there.
    if (
      IS_NATIVE &&
      response.data &&
      typeof response.data === 'object' &&
      response.data.refreshToken
    ) {
      writeRefreshToken(response.data.refreshToken);
    }
    return response;
  },
  async (error) => {
    // Step-up challenge: a high-risk action needs a fresh re-auth proof. Collect
    // it via <StepUpModal> (password or TOTP per the server-supplied `factor`)
    // and retry the request ONCE with the proof attached. `_stepUpRetried`
    // guards against a loop if the proof is somehow still rejected. A money POST
    // keeps its Idempotency-Key across the retry (the first attempt was rejected
    // at the gate, before the controller, so nothing moved).
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'STEP_UP_REQUIRED'
    ) {
      const original = error.config;
      if (original && !original._stepUpRetried) {
        original._stepUpRetried = true;
        try {
          const proof = await requestStepUp(error.response.data.factor);
          original.headers = original.headers || {};
          original.headers['x-step-up-token'] = proof;
          return api(original);
        } catch {
          // User cancelled / abandoned re-auth — surface the original 403 so
          // the calling code can reset its own loading state.
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isMemberRoute = currentPath.startsWith('/member/');

      // On auth pages, a 401 means "bad credentials" — let the calling form
      // show its own error message and reset its loading state.
      if (isOnAuthPage(currentPath)) {
        return Promise.reject(error);
      }

      // Reactive silent refresh: the access token expired mid-flight (or a
      // clock-skew race beat the proactive check). Try ONE refresh + retry the
      // original request before giving up. `_sessionRetried` guards against an
      // infinite loop if the retry also 401s. The refresh itself runs on a bare
      // client, so its own response never re-enters this interceptor.
      const original = error.config;
      if (original && !original._sessionRetried) {
        original._sessionRetried = true;
        try {
          const token = await refreshAccessToken();
          applyNewToken(token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        } catch {
          // fall through to ending the session
        }
      }

      handleExpiredSession(isMemberRoute);
      // Pending promise so consuming code doesn't surface an error before
      // the redirect completes.
      return new Promise(() => {});
    }
    return Promise.reject(error);
  },
);

export default api;
