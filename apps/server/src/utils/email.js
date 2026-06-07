const nodemailer = require('nodemailer');
const SystemSettings = require('../models/SystemSettings');

// ── In-memory cache for SystemSettings (60 second TTL) ────────────────────────
let _settingsCache = null;
let _settingsCacheTime = 0;
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

const getCachedSettings = async () => {
  const now = Date.now();
  if (_settingsCache && now - _settingsCacheTime < SETTINGS_CACHE_TTL_MS) {
    return _settingsCache;
  }
  _settingsCache = await SystemSettings.getSettings();
  _settingsCacheTime = now;
  return _settingsCache;
};

// Call this whenever SMTP settings are updated so the cache is immediately invalidated
const invalidateSettingsCache = () => {
  _settingsCache = null;
  _settingsCacheTime = 0;
};

// ── Nodemailer SMTP (fallback for local dev) ───────────────────────────────────
const createSmtpTransporter = async (settings, debug = false) => {
  try {
    const config = settings.smtpConfig;

    // Primary: use DB config if fully configured
    if (
      config &&
      config.host &&
      config.host.trim() !== '' &&
      config.auth?.user
    ) {
      console.log('[SMTP CONFIG] Using Database configuration.');

      if (config.host.toLowerCase().includes('gmail.com')) {
        console.log(
          '[SMTP CONFIG] Detected Gmail: using Gmail service (SMTPS 465).',
        );
        // Use nodemailer's built-in Gmail service (smtp.gmail.com:465, SMTPS).
        // The previous forced 587/STARTTLS + IPv4-only (family:4) config timed
        // out on Railway; this mirrors the working utils/sendEmail.js transport.
        return nodemailer.createTransport({
          service: 'gmail',
          auth: { user: config.auth.user, pass: config.auth.pass },
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000,
          logger: debug,
          debug: debug,
        });
      }

      const port = parseInt(config.port) || 587;
      return nodemailer.createTransport({
        host: config.host,
        port: port,
        secure: port === 465,
        auth: { user: config.auth.user, pass: config.auth.pass },
        family: 4,
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        logger: debug,
        debug: debug,
        tls: { rejectUnauthorized: false },
      });
    }

    // Fallback: Env Vars
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const port = parseInt(process.env.SMTP_PORT) || 587;

    if (host && user && pass) {
      console.log(
        '[SMTP CONFIG] Using environment variables for SMTP fallback.',
      );

      if (host.toLowerCase().includes('gmail.com')) {
        console.log(
          '[SMTP CONFIG] Detected Gmail: using Gmail service (SMTPS 465).',
        );
        // Mirror the working utils/sendEmail.js transport — service:'gmail'
        // connects over SMTPS (465). The previous 587/STARTTLS + family:4 config
        // timed out on Railway.
        return nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000,
          logger: debug,
          debug: debug,
        });
      }

      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        family: 4,
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        logger: debug,
        debug: debug,
        tls: { rejectUnauthorized: false },
      });
    }

    console.warn(
      '[SMTP CONFIG] No valid SMTP configuration found in DB or Env.',
    );
    return null;
  } catch (error) {
    console.error('Failed to configure SMTP transporter:', error);
    return null;
  }
};

/**
 * Sends an email using Nodemailer SMTP.
 * @param {Object} options - { to, subject, html, text, debug }
 * @returns {Boolean} - success status
 */
const sendEmail = async (options) => {
  try {
    const settings = await getCachedSettings();

    const fromEmail =
      settings.smtpConfig?.fromEmail ||
      process.env.FROM_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      `noreply@${settings.platformName.toLowerCase().replace(/\s+/g, '')}.com`;
    const fromName =
      settings.smtpConfig?.fromName ||
      process.env.FROM_NAME ||
      process.env.SMTP_FROM_NAME ||
      settings.platformName;

    const transporter = await createSmtpTransporter(
      settings,
      options.debug || false,
    );

    if (!transporter) {
      console.warn('Email skipped: No valid SMTP configuration.');
      return false;
    }

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent via SMTP to ${options.to} [${info.messageId}]`);
    return true;
  } catch (error) {
    console.error('Email Delivery Failed:', error.message);
    if (error.stack) console.error('Stack Trace:', error.stack);
    return false;
  }
};

/**
 * Sends an email in a non-blocking, fire-and-forget manner.
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmailAsync = (options) => {
  sendEmail(options).catch((err) =>
    console.error('Background email error:', err.message),
  );
};

module.exports = { sendEmail, sendEmailAsync, invalidateSettingsCache };
