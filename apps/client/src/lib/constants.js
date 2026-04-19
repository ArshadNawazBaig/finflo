export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'development'
    ? '' // Empty string = same origin, goes through Vite proxy (/socket.io → 127.0.0.1:5001)
    : window.location.origin);

export const IS_PRODUCTION = import.meta.env.MODE === 'production';
export const MOBILE_PAGE_LIMIT = 5;
export const DESKTOP_PAGE_LIMIT = 10;

// Domain Configuration
export const LANDING_DOMAIN = 'finflo.org';
export const APP_DOMAIN = 'app.finflo.org';

const hostname = window.location.hostname;
export const IS_LANDING_DOMAIN =
  hostname === LANDING_DOMAIN || hostname === `www.${LANDING_DOMAIN}`;
export const IS_APP_DOMAIN = hostname === APP_DOMAIN;
export const IS_DEV =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.includes('.local');

// Native platform detection (Capacitor Android/iOS)
export const IS_NATIVE = (() => {
  try {
    const platform = window.Capacitor?.getPlatform?.();
    return platform === 'android' || platform === 'ios';
  } catch {
    return false;
  }
})();

// App mode: 'member' or 'business' — set via VITE_APP_MODE at build time
// Defaults to 'business' for backward compatibility
export const APP_MODE = import.meta.env.VITE_APP_MODE || 'business';

export const getAppUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (IS_DEV) return cleanPath;
  return `https://${APP_DOMAIN}${cleanPath}`;
};

export const getLandingUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (IS_DEV) return cleanPath;
  return `https://www.${LANDING_DOMAIN}${cleanPath}`;
};
