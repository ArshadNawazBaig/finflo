const nodemailer = require('nodemailer');
const { Resend } = require('resend');
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

// ── Resend (HTTP API — Railway compatible) ─────────────────────────────────────
const sendViaResend = async (options, fromEmail, fromName) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return null; // Not configured, fall through to SMTP

  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    throw new Error(
      `Resend API error: ${error.message || JSON.stringify(error)}`,
    );
  }

  console.log(`[EMAIL] Sent via Resend: ${data.id}`);
  return data.id;
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
          '[SMTP CONFIG] Detected Gmail: Forcing Port 587 and STARTTLS.',
        );
        return nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user: config.auth.user, pass: config.auth.pass },
          family: 4,
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000,
          logger: debug,
          debug: debug,
          tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
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
        return nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user, pass },
          family: 4,
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000,
          logger: debug,
          debug: debug,
          tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
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
 * Sends an email.
 * Uses Resend (HTTP) if RESEND_API_KEY is set — works on Railway.
 * Falls back to nodemailer SMTP for local development.
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

    // ── Try Resend first (production / Railway) ───────────────────────────────
    if (process.env.RESEND_API_KEY) {
      console.log('[EMAIL] Resend API key found — using Resend for delivery.');
      await sendViaResend(options, fromEmail, fromName);
      return true;
    }

    // ── Fall back to SMTP (local dev) ─────────────────────────────────────────
    console.log('[EMAIL] No Resend API key — falling back to SMTP.');
    const transporter = await createSmtpTransporter(
      settings,
      options.debug || false,
    );

    if (!transporter) {
      console.warn(
        'Email skipped: No Resend API key and no valid SMTP configuration.',
      );
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
