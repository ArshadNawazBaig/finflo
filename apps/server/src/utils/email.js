const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const SystemSettings = require('../models/SystemSettings');

// Resolve a hostname to a single IPv4 address. nodemailer 8's resolver IGNORES
// the `family` option — it resolves BOTH A and AAAA records and then picks one
// AT RANDOM (lib/shared/resolveHostname → formatDNSValue). smtp.gmail.com has an
// AAAA record, so ~half the time nodemailer dials IPv6, which on Railway (no
// IPv6 egress route) fails with `connect ENETUNREACH …:465`. Handing nodemailer
// an IPv4 literal makes it skip resolution entirely (net.isIP short-circuit), so
// we always dial IPv4. Returns null if resolution fails (caller keeps the host).
const resolveIpv4 = async (hostname) => {
  try {
    const addrs = await dns.resolve4(hostname);
    if (addrs && addrs.length) return addrs[0];
  } catch (_) {
    // fall through to dns.lookup
  }
  try {
    const { address } = await dns.lookup(hostname, { family: 4 });
    return address || null;
  } catch (_) {
    return null;
  }
};

const isGmailHost = (host) => !!host && host.toLowerCase().includes('gmail.com');

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

    // Resolve the connection details from DB config (preferred) or env vars.
    let rawHost;
    let user;
    let pass;
    let port;

    if (
      config &&
      config.host &&
      config.host.trim() !== '' &&
      config.auth?.user
    ) {
      console.log('[SMTP CONFIG] Using Database configuration.');
      rawHost = config.host.trim();
      user = config.auth.user;
      pass = config.auth.pass;
      port = parseInt(config.port) || 587;
    } else {
      rawHost = process.env.SMTP_HOST;
      user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
      pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
      port = parseInt(process.env.SMTP_PORT) || 587;

      if (rawHost && user && pass) {
        console.log(
          '[SMTP CONFIG] Using environment variables for SMTP fallback.',
        );
      } else {
        console.warn(
          '[SMTP CONFIG] No valid SMTP configuration found in DB or Env.',
        );
        return null;
      }
    }

    const gmail = isGmailHost(rawHost);
    // Gmail always speaks SMTPS on 465 (matches the old service:'gmail' path).
    const host = gmail ? 'smtp.gmail.com' : rawHost;
    if (gmail) {
      port = 465;
      console.log('[SMTP CONFIG] Detected Gmail: using SMTPS 465 (IPv4).');
    }
    const secure = port === 465;

    // Force IPv4: dial a pre-resolved A record so nodemailer can't randomly
    // pick the AAAA address (ENETUNREACH on Railway). servername keeps SNI +
    // TLS cert validation pointed at the real hostname.
    const ipv4 = await resolveIpv4(host);
    if (ipv4) {
      console.log(`[SMTP CONFIG] Forcing IPv4: ${host} -> ${ipv4}:${port}`);
    } else {
      console.warn(
        `[SMTP CONFIG] Could not pre-resolve ${host} to IPv4; using hostname.`,
      );
    }

    return nodemailer.createTransport({
      host: ipv4 || host,
      port,
      secure,
      auth: { user, pass },
      family: 4,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      logger: debug,
      debug,
      tls: {
        servername: host,
        // Gmail presents a valid cert; only relax verification for arbitrary
        // (possibly self-signed) custom/dev SMTP hosts.
        ...(gmail ? {} : { rejectUnauthorized: false }),
      },
    });
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
// ── Resend HTTP API sender (works on hosts that block outbound SMTP) ──────────
// Railway (and many PaaS) block outbound SMTP ports (25/465/587), so nodemailer
// → Gmail times out / ENETUNREACHes. Resend sends over HTTPS (443) via a plain
// fetch — no npm package required (Node 18+ has global fetch). The sender domain
// must be verified in Resend (e.g. noreply@finflo.org), NOT a gmail.com address.
const sendViaResend = async ({ to, subject, html, text, fromEmail, fromName }) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend API ${res.status}: ${detail}`);
  }
  const data = await res.json().catch(() => ({}));
  return data?.id;
};

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

    // Primary: Resend HTTP API (the only path that works behind an SMTP block).
    if (process.env.RESEND_API_KEY) {
      const id = await sendViaResend({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        fromEmail,
        fromName,
      });
      console.log(`[EMAIL] Sent via Resend to ${options.to} [${id}]`);
      return true;
    }

    // Fallback: SMTP (local dev, or hosts that allow outbound SMTP).
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
