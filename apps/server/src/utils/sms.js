const logger = require('./logger');
const { normalizePhone } = require('./phone');

// Telnyx SMS sender. Config comes from the environment (inert until set, mirroring
// the email/Sentry pattern), so local/CI runs never send and production activates
// by setting the vars:
//   TELNYX_API_KEY               (required)
//   TELNYX_FROM_NUMBER           E.164 sender number, OR
//   TELNYX_MESSAGING_PROFILE_ID  a messaging profile (number pool)
const getConfig = () => ({
  apiKey: process.env.TELNYX_API_KEY,
  from: process.env.TELNYX_FROM_NUMBER,
  messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID,
});

const isSmsConfigured = () => {
  const c = getConfig();
  return !!(c.apiKey && (c.from || c.messagingProfileId));
};

let warnedDisabled = false;

/**
 * Send one SMS. Returns true on accepted send, false otherwise (never throws).
 * @param {{to: string, text: string}} opts
 */
const sendSms = async ({ to, text } = {}) => {
  const c = getConfig();
  if (!isSmsConfigured()) {
    if (!warnedDisabled) {
      logger.info(
        '[SMS] Telnyx not configured (set TELNYX_API_KEY + TELNYX_FROM_NUMBER or TELNYX_MESSAGING_PROFILE_ID) — SMS disabled.',
      );
      warnedDisabled = true;
    }
    return false;
  }

  const dest = normalizePhone(to);
  if (!dest) {
    logger.warn({ to }, '[SMS] Could not normalise destination number — skipped.');
    return false;
  }
  if (!text) return false;

  try {
    const body = { to: dest, text };
    if (c.from) body.from = c.from;
    if (c.messagingProfileId) body.messaging_profile_id = c.messagingProfileId;

    const res = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error({ status: res.status, errText }, '[SMS] Telnyx send failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, '[SMS] Telnyx send error');
    return false;
  }
};

/** Fire-and-forget SMS — never blocks or throws into the caller. */
const sendSmsAsync = (opts) => {
  const { background } = require('./background');
  return background(sendSms(opts).catch((err) => logger.error({ err }, '[SMS] async send error')));
};

module.exports = { sendSms, sendSmsAsync, isSmsConfigured };
