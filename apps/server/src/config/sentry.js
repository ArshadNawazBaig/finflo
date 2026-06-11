const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

let enabled = false;

// Initialise Sentry error tracking. INERT unless SENTRY_DSN is set, so local/CI
// runs are unaffected and production gains error tracking simply by setting the
// env var. PII/secrets are scrubbed in beforeSend — the app encrypts these at
// rest and logs/telemetry must not undo that.
const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('[Sentry] SENTRY_DSN not set — error tracking disabled.');
    return;
  }
  Sentry.init({
    dsn,
    environment: env(),
    release:
      process.env.RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    beforeSend: (event) => {
      try {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        if (event.request?.cookies) delete event.request.cookies;
        // Request bodies can carry PINs, CNICs, account numbers — never ship them.
        if (event.request?.data) event.request.data = '[redacted]';
      } catch {
        // Never block delivery because scrubbing hiccuped.
      }
      return event;
    },
  });
  enabled = true;
  logger.info('[Sentry] Error tracking enabled.');
};

const env = () => process.env.NODE_ENV || 'development';

// Safe capture wrapper — a no-op when Sentry is disabled, and never throws.
const captureException = (err, context) => {
  if (!enabled) return;
  try {
    Sentry.captureException(err, context);
  } catch {
    // ignore
  }
};

module.exports = {
  initSentry,
  captureException,
  isEnabled: () => enabled,
  Sentry,
};
