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

/**
 * Creates a configured Nodemailer transporter.
 * Falls back to environment variables if DB settings are incomplete.
 * Uses cached settings to avoid repeated DB hits.
 */
const createTransporter = async (settings) => {
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
      return nodemailer.createTransport({
        host: config.host,
        port: parseInt(config.port) || 587,
        secure: parseInt(config.port) === 465,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
        family: 4, // Force IPv4 to avoid ENETUNREACH errors on ipv6-ready servers without routes
        tls: { rejectUnauthorized: false },
      });
    }

    // Fallback to Env Vars
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const port = parseInt(process.env.SMTP_PORT) || 587;

    console.log('[SMTP CONFIG] DB config check:', {
      hasConfig: !!config,
      hasHost: !!(config && config.host),
      hostValue: config?.host,
    });

    if (host && user && pass) {
      console.log(
        '[SMTP CONFIG] Using environment variables for SMTP fallback.',
      );
      return nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465,
        auth: {
          user: user,
          pass: pass,
        },
        family: 4, // Force IPv4 for environment fallback too
        tls: { rejectUnauthorized: false },
      });
    }

    console.warn(
      '[SMTP CONFIG] No valid SMTP configuration found in DB or Env.',
    );
    return null;
  } catch (error) {
    console.error('Failed to configure email transporter', error);
    return null;
  }
};

/**
 * Sends an email using the configured transporter.
 * @param {Object} options - Email options { to, subject, html, text }
 * @returns {Boolean} - Success status
 */
const sendEmail = async (options) => {
  try {
    const settings = await getCachedSettings();
    const transporter = await createTransporter(settings);

    if (!transporter) {
      console.warn('Email skipped: SMTP configuration is missing.');
      return false;
    }

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

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.to} [${info.messageId}]`);
    return true;
  } catch (error) {
    console.error('Email Delivery Failed:', error.message);
    return false;
  }
};

/**
 * Sends an email in a non-blocking, fire-and-forget manner.
 * @param {Object} options - Email options { to, subject, html, text }
 */
const sendEmailAsync = (options) => {
  sendEmail(options).catch((err) =>
    console.error('Background email error:', err.message),
  );
};

module.exports = { sendEmail, sendEmailAsync, invalidateSettingsCache };
