import axios from 'axios';
import { getDefaultStore } from 'jotai';
import { memberAtom, userAtom, isRedirectingAtom } from '@/atoms';
import { isTokenExpired } from './jwt';

// Determine the API base URL based on the environment
import { BACKEND_URL } from './constants';

const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : '/api',
  withCredentials: true,
});

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
  if (MONEY_POST_PATTERNS.some((re) => re.test(url))) {
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

api.interceptors.request.use(
  (config) => {
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

    // If we *have* a token but it's expired, short-circuit so we don't waste
    // a 401 round-trip and trigger the render-time error flash. A missing
    // token is fine to send — the endpoint might be public (`/public/stats`,
    // `/health`, etc.); if it isn't, the server returns 401 and the response
    // interceptor takes over.
    if (token && isTokenExpired(token)) {
      handleExpiredSession(isMemberRoute);
      return new Promise(() => {});
    }

    if (token && typeof token === 'string') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    tagIdempotency(config);
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    response.data = unwrapEnvelope(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isMemberRoute = currentPath.startsWith('/member/');

      // On auth pages, a 401 means "bad credentials" — let the calling form
      // show its own error message and reset its loading state.
      if (isOnAuthPage(currentPath)) {
        return Promise.reject(error);
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
