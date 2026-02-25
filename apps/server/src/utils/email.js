const nodemailer = require('nodemailer');
const SystemSettings = require('../models/SystemSettings');

/**
 * Creates a configured Nodemailer transporter using settings from the database.
 * Falls back to environment variables if DB settings are incomplete.
 */
const createTransporter = async () => {
  try {
    const settings = await SystemSettings.getSettings();
    const config = settings.smtpConfig;

    if (config && config.host && config.auth?.user) {
      return nodemailer.createTransport({
        host: config.host,
        port: config.port || 587,
        secure: config.secure || false,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
      });
    }

    // Fallback to Env Vars if DB is empty
    const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (process.env.SMTP_HOST && user) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure:
          process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT == 465,
        auth: {
          user: user,
          pass: pass,
        },
      });
    }

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
    const transporter = await createTransporter();

    if (!transporter) {
      console.warn('Email skipped: SMTP configuration is missing.');
      return false;
    }

    const settings = await SystemSettings.getSettings();
    const fromEmail =
      settings.smtpConfig?.fromEmail ||
      process.env.SMTP_FROM_EMAIL ||
      `noreply@${settings.platformName.toLowerCase().replace(/\s+/g, '')}.com`;
    const fromName =
      settings.smtpConfig?.fromName ||
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

module.exports = { sendEmail };
