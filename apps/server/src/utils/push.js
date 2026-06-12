const logger = require('./logger');

// FCM HTTP v1 push sender. Config comes from the environment (inert until set,
// mirroring the SMS/Sentry pattern), so local/CI runs never send and production
// activates by setting a Firebase service-account's fields:
//   FCM_PROJECT_ID    Firebase project id
//   FCM_CLIENT_EMAIL  service-account client_email
//   FCM_PRIVATE_KEY   service-account private_key (literal "\n" allowed; unescaped here)
//
// We mint an OAuth2 access token with google-auth-library (already a dependency)
// rather than pulling in firebase-admin.
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

const getConfig = () => ({
  projectId: process.env.FCM_PROJECT_ID,
  clientEmail: process.env.FCM_CLIENT_EMAIL,
  // Env vars can't hold real newlines — accept the escaped form and restore them.
  privateKey: process.env.FCM_PRIVATE_KEY
    ? process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined,
});

const isPushConfigured = () => {
  const c = getConfig();
  return !!(c.projectId && c.clientEmail && c.privateKey);
};

let warnedDisabled = false;

// Cache the OAuth2 access token between sends (access tokens last ~1h).
let cachedToken = null;
let cachedTokenExpiry = 0;

const getAccessToken = async (c) => {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry - 60_000) return cachedToken;

  const { JWT } = require('google-auth-library');
  const client = new JWT({
    email: c.clientEmail,
    key: c.privateKey,
    scopes: [FCM_SCOPE],
  });
  const { access_token: accessToken } = await client.authorize();
  cachedToken = accessToken;
  // google-auth-library refreshes internally; expire our cache conservatively.
  cachedTokenExpiry = now + 55 * 60_000;
  return accessToken;
};

// Best-effort: deactivate a stale token so we stop targeting a dead device.
const deactivateToken = async (token) => {
  try {
    const DeviceToken = require('../models/DeviceToken');
    await DeviceToken.findOneAndUpdate({ token }, { $set: { isActive: false } });
  } catch (err) {
    logger.warn({ err }, '[Push] Failed to deactivate stale token');
  }
};

/**
 * Send a push notification to one or more device tokens via FCM HTTP v1.
 * Returns { sent, failed } (counts), or false when unconfigured. Never throws.
 * @param {{tokens: string[], title: string, body: string, data?: object}} opts
 */
const sendPush = async ({ tokens = [], title, body, data = {} } = {}) => {
  const c = getConfig();
  if (!isPushConfigured()) {
    if (!warnedDisabled) {
      logger.info(
        '[Push] FCM not configured (set FCM_PROJECT_ID + FCM_CLIENT_EMAIL + FCM_PRIVATE_KEY) — push disabled.',
      );
      warnedDisabled = true;
    }
    return false;
  }

  const list = (tokens || []).filter(Boolean);
  if (list.length === 0) return { sent: 0, failed: 0 };

  // FCM data payload values must be strings.
  const stringData = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v !== undefined && v !== null) stringData[k] = String(v);
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(c);
  } catch (err) {
    logger.error({ err }, '[Push] Failed to mint FCM access token');
    return { sent: 0, failed: list.length };
  }

  const url = `https://fcm.googleapis.com/v1/projects/${c.projectId}/messages:send`;
  let sent = 0;
  let failed = 0;

  for (const token of list) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: stringData,
          },
        }),
      });

      if (res.ok) {
        sent += 1;
        continue;
      }

      failed += 1;
      const errText = await res.text().catch(() => '');
      // A 404 (NOT_FOUND / UNREGISTERED) means the token is dead — clean it up.
      if (res.status === 404 || /UNREGISTERED/i.test(errText)) {
        await deactivateToken(token);
      } else {
        logger.error({ status: res.status, errText }, '[Push] FCM send failed');
      }
    } catch (err) {
      failed += 1;
      logger.error({ err }, '[Push] FCM send error');
    }
  }

  return { sent, failed };
};

/** Fire-and-forget push — never blocks or throws into the caller. */
const sendPushAsync = (opts) => {
  sendPush(opts).catch((err) => logger.error({ err }, '[Push] async send error'));
};

module.exports = { sendPush, sendPushAsync, isPushConfigured };
