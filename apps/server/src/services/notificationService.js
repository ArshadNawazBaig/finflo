const {
  createTransactionNotification,
  ACTION_TO_PREFERENCE,
} = require('../utils/notificationHelper');
const { sendEmailAsync } = require('../utils/email');
const { sendSmsAsync, isSmsConfigured } = require('../utils/sms');

/**
 * Channel-agnostic notification dispatcher.
 *
 * One call fans a notification out across in-app, email, and SMS, each gated by
 * the member's per-channel preference for the notification's category. This is
 * the single front door for multi-channel sends — callers stop wiring email/SMS
 * by hand. In-app reuses createTransactionNotification (which keeps its own
 * inApp-preference check + socket emit + activity log).
 *
 * Each channel is best-effort and non-blocking: email/SMS are fired async and a
 * failure in one channel never affects the others or the caller.
 *
 * @param {object} opts
 * @param {import('mongoose').Document} [opts.member] loaded Member doc (gives
 *   decrypted phone/email + prefs); fetched by recipientId if omitted.
 * @param {string} opts.recipientId
 * @param {'Member'|'User'} [opts.recipientModel]
 * @param {string} [opts.action] maps to a preference category via ACTION_TO_PREFERENCE
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.type] 'info'|'success'|'warning'|'error'
 * @param {string} [opts.link]
 * @param {string} [opts.branchId]
 * @param {object} [opts.metadata]
 * @param {Array<'inApp'|'email'|'sms'>} [opts.channels] channels to attempt
 * @param {{subject?: string, html: string}} [opts.email] email payload (skipped if absent)
 * @param {string} [opts.smsText] SMS body override (defaults to message)
 * @returns {Promise<{inApp: object|null, email: boolean, sms: boolean}>} per-channel outcome
 */
const dispatch = async ({
  member = null,
  recipientId,
  recipientModel = 'Member',
  action = 'transaction_notification',
  title,
  message,
  type = 'info',
  link,
  branchId,
  metadata = {},
  channels = ['inApp', 'email', 'sms'],
  email = null,
  smsText = null,
} = {}) => {
  const results = { inApp: null, email: false, sms: false };

  // Load the member once when an off-app channel needs phone/email/prefs.
  // A normal findById runs the post-hooks that decrypt phone — do NOT use .lean().
  let memberDoc = member;
  const needsMemberDoc =
    recipientModel === 'Member' &&
    (channels.includes('email') || channels.includes('sms'));
  if (!memberDoc && needsMemberDoc && recipientId) {
    const Member = require('../models/Member');
    memberDoc = await Member.findById(recipientId);
  }

  const category = ACTION_TO_PREFERENCE[action];
  const allowed = (channel) => {
    // No category mapping (or non-member recipient) → no preference gate.
    if (recipientModel !== 'Member' || !category) return true;
    return memberDoc?.notificationPreferences?.[channel]?.[category] !== false;
  };

  // 1. In-app (primitive applies its own inApp pref check + socket + activity log)
  if (channels.includes('inApp') && recipientId) {
    results.inApp = await createTransactionNotification({
      recipientId,
      recipientModel,
      title,
      message,
      type,
      branchId,
      metadata: { ...metadata, link },
      action,
    });
  }

  // 2. Email
  if (channels.includes('email') && email?.html && memberDoc?.email && allowed('email')) {
    sendEmailAsync({ to: memberDoc.email, subject: email.subject || title, html: email.html });
    results.email = true;
  }

  // 3. SMS
  if (
    channels.includes('sms') &&
    isSmsConfigured() &&
    memberDoc?.phone &&
    allowed('sms')
  ) {
    sendSmsAsync({ to: memberDoc.phone, text: smsText || message });
    results.sms = true;
  }

  return results;
};

module.exports = { dispatch };
