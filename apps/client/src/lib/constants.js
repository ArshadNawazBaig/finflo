export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'development'
    ? '' // Empty string = same origin, goes through Vite proxy (/socket.io → 127.0.0.1:5001)
    : window.location.origin);

export const IS_PRODUCTION = import.meta.env.MODE === 'production';

// Email/password auth is temporarily disabled while email verification (SMTP)
// is unavailable on Railway — only Google sign-in is offered. The email login
// and registration UI is preserved (not removed); flip this to `true` to
// restore it everywhere once SMTP/email delivery works again.
export const EMAIL_AUTH_ENABLED = true;

// Until a live Stripe account is connected, the pricing/billing surfaces should
// not drive users into the real upgrade/checkout flow. When this is `true`, the
// "Upgrade to Basic/Pro" CTAs on the landing pricing section, the Pricing page,
// and the Billing page are replaced with a "Contact us" button that opens the
// "Schedule a Strategy Call" ContactModal. Flip to `false` to restore the live
// Stripe upgrade/checkout flow everywhere.
export const CONTACT_SALES_ENABLED = true;

export const MOBILE_PAGE_LIMIT = 5;
export const DESKTOP_PAGE_LIMIT = 10;

// Domain Configuration
// The same client build serves both production and staging; the landing/app
// domain pair is selected from the current hostname so the two-domain split
// and cross-domain links (getAppUrl/getLandingUrl) resolve within the right
// environment instead of bouncing a staging visitor to production.
//   Production: finflo.org (landing)      + app.finflo.org (app)
//   Staging:    test.finflo.org (landing) + app-test.finflo.org (app)
const hostname = window.location.hostname;

const IS_STAGING_HOST =
  hostname === 'test.finflo.org' || hostname === 'app-test.finflo.org';

export const LANDING_DOMAIN = IS_STAGING_HOST
  ? 'test.finflo.org'
  : 'finflo.org';
export const APP_DOMAIN = IS_STAGING_HOST
  ? 'app-test.finflo.org'
  : 'app.finflo.org';

export const IS_LANDING_DOMAIN =
  hostname === LANDING_DOMAIN || hostname === `www.${LANDING_DOMAIN}`;
export const IS_APP_DOMAIN = hostname === APP_DOMAIN;
export const IS_DEV =
  // True whenever the Vite dev server is running, regardless of the host/IP
  // used to reach it (vite `host: true` also serves on the LAN IP, where
  // hostname-based checks would otherwise fail and bounce `/` to /login).
  import.meta.env.DEV ||
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

// App mode: 'member' or 'business'
// On native APKs loading a remote URL, VITE_APP_MODE from the deployed build
// is always the same. Detect mode via URL query param (?app_mode=member),
// Capacitor appId, or build-time env var.
export const APP_MODE = (() => {
  // 1. Check URL query parameter (set in capacitor server.url)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('app_mode');
    if (modeParam === 'member' || modeParam === 'business') return modeParam;
  } catch {
    /* ignore */
  }

  // 2. On native platforms, check the Capacitor-injected appId
  if (IS_NATIVE) {
    try {
      const nativeAppId =
        window.Capacitor?.config?.appId || // Capacitor 5+
        window.Capacitor?.Plugins?.App?.id; // fallback
      if (nativeAppId === 'com.finflo.member') return 'member';
      if (nativeAppId === 'com.finflo.business') return 'business';
    } catch {
      /* ignore */
    }
  }

  // 3. Fall back to build-time env var (works for local dev / direct builds)
  return import.meta.env.VITE_APP_MODE || 'business';
})();

export const getAppUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (IS_DEV) return cleanPath;
  return `https://${APP_DOMAIN}${cleanPath}`;
};

export const getLandingUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (IS_DEV) return cleanPath;
  return `https://${LANDING_DOMAIN}${cleanPath}`;
};
