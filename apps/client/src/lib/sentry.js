import * as Sentry from '@sentry/react';
import { IS_DEV } from '@/lib/constants';

// Staging hosts (test.finflo.org / app-test.finflo.org) vs production — derived
// here because constants.js keeps its staging flag module-local.
const IS_STAGING_HOST =
  typeof window !== 'undefined' &&
  /(^test\.|^app-test\.)/.test(window.location.hostname);

// DSN comes from the environment (VITE_SENTRY_DSN). Set it in apps/client/.env
// (local) and apps/client/.env.production (deployed builds), or as a deploy-time
// env var. When unset, initSentry() below is a no-op — error tracking stays off.
const DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  // Never report from local dev — only deployed (staging/production) builds.
  if (IS_DEV || !DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: IS_STAGING_HOST ? 'staging' : 'production',
    release: import.meta.env.VITE_RELEASE || undefined,
    // Errors only by default; raise VITE_SENTRY_TRACES_SAMPLE_RATE for tracing.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0),
    // Don't auto-attach IPs / user PII — this is a financial app.
    sendDefaultPii: false,
    beforeSend(event) {
      try {
        if (event.request?.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers.authorization;
          delete event.request.headers.Cookie;
        }
      } catch {
        // Never block delivery because scrubbing hiccuped.
      }
      return event;
    },
    // The app deliberately reloads on stale-chunk errors after a deploy — those
    // are expected, not bugs, so keep them out of Sentry.
    ignoreErrors: [
      /Loading chunk/i,
      /CSS chunk/i,
      /dynamically imported module/i,
      /valid JavaScript MIME type/i,
      /Importing a module script failed/i,
    ],
  });
};

export { Sentry };
