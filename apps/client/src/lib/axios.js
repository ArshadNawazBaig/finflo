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

    // Token is missing or already expired — short-circuit the request and
    // trigger the redirect immediately. Avoids the 401 round-trip and the
    // resulting render-time error flash.
    if (!token || isTokenExpired(token)) {
      handleExpiredSession(isMemberRoute);
      // Return a never-resolving promise so calling code doesn't try to
      // handle this as a real error before the redirect lands.
      return new Promise(() => {});
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
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
