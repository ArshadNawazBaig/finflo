/**
 * Centralized Email Templates for Financial Intelligence Portal
 *
 * All templates render through `getBaseTemplate`, a table-based, inline-styled
 * shell that renders consistently across email clients (Gmail, Outlook, Apple
 * Mail). White-label tenants pass their own brand name / color / logo; platform
 * (FinFlo) emails fall back to the defaults.
 */

const DEFAULT_LOGO =
  'https://res.cloudinary.com/dzfcf4sqf/image/upload/v1772130786/favicon_m58hqu.png';

// Matches the app's brand primary (indigo-600, --primary in the client theme).
// Tenant brand colors fall through to it for white-label emails.
const DEFAULT_COLOR = '#4f46e5';

// The app's UI font (Plus Jakarta Sans) with a system fallback for email
// clients that strip web fonts (Outlook, most of Gmail).
const FONT_STACK =
  "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Lighten (positive percent) or darken (negative) a hex color. Used to derive a
// gradient from a single brand color so the header band has depth for any tenant.
const shade = (hex, percent) => {
  const n = (hex || '').replace('#', '');
  const f = n.length === 3 ? n.replace(/(.)/g, '$1$1') : n;
  const num = parseInt(f, 16);
  if (Number.isNaN(num)) return hex;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const r = Math.round((t - ((num >> 16) & 0xff)) * p) + ((num >> 16) & 0xff);
  const g = Math.round((t - ((num >> 8) & 0xff)) * p) + ((num >> 8) & 0xff);
  const b = Math.round((t - (num & 0xff)) * p) + (num & 0xff);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const getBaseTemplate = (
  content,
  title,
  logoUrl = null,
  customBrandName = null,
  customBrandColor = null,
) => {
  const brandName = customBrandName || process.env.FROM_NAME || 'FinFlo';
  const primaryColor = customBrandColor || DEFAULT_COLOR;
  const logoPath = logoUrl || DEFAULT_LOGO;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body, table, td, p, h1, h2, h3, a, span, div { font-family: ${FONT_STACK}; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#eef1f6;font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${title}</div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#eef1f6;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06),0 10px 30px rgba(15,23,42,0.06);">

          <!-- Header (branded band) -->
          <tr>
            <td align="center" style="background-color:${primaryColor};background-image:linear-gradient(135deg, ${shade(primaryColor, 14)} 0%, ${primaryColor} 52%, ${shade(primaryColor, -20)} 100%);padding:44px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background-color:#ffffff;border-radius:16px;padding:11px;line-height:0;box-shadow:0 6px 16px rgba(0,0,0,0.16);">
                    <img src="${logoPath}" alt="${brandName}" width="46" height="46" style="display:block;border-radius:9px;">
                  </td>
                </tr>
              </table>
              <div style="margin-top:18px;font-size:19px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;text-transform:capitalize;">${brandName}</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 40px 0 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:32px 40px 36px 40px;">
              <div style="border-top:1px solid #eef1f6;padding-top:24px;">
                <p style="margin:0;font-size:12px;color:#94a3b8;font-weight:600;">© ${year} ${brandName}</p>
                <p style="margin:6px 0 0 0;font-size:11px;color:#cbd5e1;line-height:1.5;">This is an automated message — please do not reply directly to this email.</p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ── Shared content building blocks ────────────────────────────────────────────

const heading = (text, color = '#0f172a') =>
  `<h2 style="margin:0 0 16px 0;color:${color};font-size:20px;font-weight:700;letter-spacing:-0.01em;">${text}</h2>`;

const paragraph = (text, color = '#475569') =>
  `<p style="margin:0 0 20px 0;color:${color};font-size:15px;line-height:1.65;">${text}</p>`;

const greetingLine = (name) =>
  `<p style="margin:0 0 20px 0;color:#0f172a;font-size:15px;line-height:1.65;">Hi <span style="font-weight:700;text-transform:capitalize;">${name}</span>,</p>`;

const ctaButton = (url, label, color = DEFAULT_COLOR) => `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding:12px 0 28px 0;">
          <a href="${url}" style="display:inline-block;background-color:${color};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:10px;">${label}</a>
        </td>
      </tr>
    </table>`;

const detailRow = (label, value, opts = {}) => `
        <tr>
          <td style="padding:11px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">${label}</td>
          <td align="right" style="padding:11px 0;color:${opts.color || '#0f172a'};font-size:14px;font-weight:${opts.weight || 600};border-bottom:1px solid #f1f5f9;${opts.capitalize ? 'text-transform:capitalize;' : ''}">${value}</td>
        </tr>`;

const infoCard = (rows) => `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #eef1f6;border-radius:14px;margin-bottom:28px;">
      <tr>
        <td style="padding:8px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            ${rows}
          </table>
        </td>
      </tr>
    </table>`;

const helperNote = (text) =>
  `<p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">${text}</p>`;

const codeBlock = (code) => `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td align="center" style="background-color:#f8fafc;border:1px solid #eef1f6;border-radius:14px;padding:28px 16px;">
          <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;font-weight:700;color:${DEFAULT_COLOR};letter-spacing:10px;padding-left:10px;">${code}</span>
        </td>
      </tr>
    </table>`;

const escapeHtml = (s) =>
  (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Verification Email Template — platform onboarding, always FinFlo-branded.
 * `businessName` is used only as a friendly greeting, never as the header brand.
 */
const verificationEmail = (code, businessName = null, logoUrl = null) => {
  const content = `
    ${businessName ? greetingLine(businessName) : ''}
    ${heading('Verify your email')}
    ${paragraph(
      'Thanks for joining the platform. Enter the 6-digit verification code below to finish setting up your account:',
    )}
    ${codeBlock(code)}
    ${helperNote('This code expires in 10 minutes for your security. If you didn’t request it, you can safely ignore this email.')}
  `;
  // FinFlo-branded (no custom brand/logo) — this is a platform onboarding email.
  return getBaseTemplate(content, 'Verify Your Email');
};

/**
 * Password Reset Template
 */
const passwordResetEmail = (resetUrl, businessName = null, logoUrl = null) => {
  const content = `
    ${heading('Reset your password')}
    ${paragraph(
      'We received a request to reset your password. Click the button below to choose a new one. This link is valid for a limited time.',
    )}
    ${ctaButton(resetUrl, 'Reset Password')}
    ${paragraph('Or paste this link into your browser:', '#94a3b8')}
    <p style="margin:0 0 8px 0;color:${DEFAULT_COLOR};font-size:12px;word-break:break-all;font-family:monospace;background-color:#f8fafc;border:1px solid #eef1f6;padding:14px;border-radius:10px;">${resetUrl}</p>
    <p style="margin:20px 0 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">If you didn’t request a password reset, you can safely ignore this email — your password won’t change.</p>
  `;
  return getBaseTemplate(content, 'Reset Your Password', logoUrl, businessName);
};

/**
 * FinFlo Loan Reminder Template
 */
const loanReminderEmail = (
  customerName,
  amount,
  dueDate,
  type,
  businessName = null,
  logoUrl = null,
) => {
  const isOverdue = type === 'overdue';
  const accentColor = isOverdue ? '#dc2626' : DEFAULT_COLOR;
  const title = isOverdue
    ? 'Overdue Payment Notice'
    : 'Upcoming Payment Reminder';
  const portalUrl = `${process.env.CLIENT_URL || 'https://finflo.org'}/member/login`;

  const content = `
    ${heading(title, accentColor)}
    ${greetingLine(customerName)}
    ${paragraph(
      isOverdue
        ? `Your loan installment of <strong style="color:#0f172a;">${amount}</strong> due on <strong style="color:#0f172a;">${dueDate}</strong> is now <strong style="color:#dc2626;">overdue</strong>. Please settle it as soon as possible to avoid additional penalties.`
        : `This is a friendly reminder that your loan installment of <strong style="color:#0f172a;">${amount}</strong> is due on <strong style="color:#0f172a;">${dueDate}</strong>.`,
    )}
    ${ctaButton(portalUrl, 'View Account', accentColor)}
    ${helperNote('If you have already made this payment, please disregard this automated reminder.')}
  `;
  return getBaseTemplate(content, title, logoUrl, businessName || null);
};

/**
 * Transaction Notification Template
 */
const transactionEmail = (data) => {
  const {
    memberName,
    transactionType,
    amount,
    date,
    balance,
    branchName,
    reference,
    currency = 'Rs.',
    logoUrl = null,
  } = data;

  const rows = [
    detailRow('Transaction Type', transactionType, { capitalize: true }),
    detailRow('Amount', `${currency}${amount}`, {
      color: DEFAULT_COLOR,
      weight: 700,
    }),
    data.senderName
      ? detailRow('Sender', data.senderName, { capitalize: true })
      : '',
    data.recipientName
      ? detailRow('Recipient', data.recipientName, { capitalize: true })
      : '',
    detailRow('Date', date),
    reference ? detailRow('Reference ID', reference) : '',
    balance !== undefined && balance !== null
      ? `
        <tr>
          <td style="padding:16px 0 8px 0;color:#0f172a;font-size:15px;font-weight:700;">Current Balance</td>
          <td align="right" style="padding:16px 0 8px 0;color:#0f172a;font-size:16px;font-weight:800;">${currency}${balance}</td>
        </tr>`
      : '',
  ].join('');

  const content = `
    ${heading('Transaction confirmation')}
    ${greetingLine(memberName)}
    ${paragraph(
      `This confirms that a <strong style="color:#0f172a;text-transform:capitalize;">${transactionType}</strong> transaction was successfully processed for your account at <strong style="color:#0f172a;">${branchName}</strong>.`,
    )}
    ${infoCard(rows)}
    ${helperNote(`Thank you for banking with ${branchName}.`)}
  `;

  return getBaseTemplate(
    content,
    `Transaction Notification - ${transactionType}`,
    logoUrl,
    branchName,
  );
};

/**
 * Member Registration Approval/Rejection Email
 */
const memberApprovalEmail = (
  memberName,
  status,
  businessName = null,
  logoUrl = null,
  rejectionReason = null,
) => {
  const isApproved = status === 'approved';
  const accentColor = isApproved ? '#16a34a' : '#dc2626';
  const title = isApproved ? 'Account Approved' : 'Registration Update';
  const portalUrl = `${process.env.CLIENT_URL || 'https://finflo.org'}/member/login`;

  // Surface the admin's rejection reason (free text → escaped) in a tinted card.
  const reasonBlock =
    !isApproved && rejectionReason
      ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fef2f2;border:1px solid #fee2e2;border-radius:14px;margin-bottom:28px;">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 6px 0;color:#dc2626;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Reason for rejection</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(rejectionReason)}</p>
        </td>
      </tr>
    </table>`
      : '';

  const content = `
    ${heading(title, accentColor)}
    ${greetingLine(memberName)}
    ${paragraph(
      isApproved
        ? 'Great news — your membership account has been <strong style="color:#16a34a;">approved</strong>. You can now log in to your member portal and access all features.'
        : 'We’ve reviewed your registration request. Unfortunately, your account was not approved at this time.',
    )}
    ${reasonBlock}
    ${isApproved ? ctaButton(portalUrl, 'Login to Member Portal', accentColor) : ''}
    ${helperNote('If you have any questions, please reach out to your branch administrator.')}
  `;
  return getBaseTemplate(content, title, logoUrl, businessName || null);
};

/**
 * Business Welcome Email Template
 */
const welcomeBusinessEmail = (businessName, logoUrl = null) => {
  const dashboardUrl = `${process.env.CLIENT_URL || 'https://finflo.org'}/dashboard`;
  const content = `
    ${heading('Welcome to FinFlo 🎉', DEFAULT_COLOR)}
    ${greetingLine(businessName)}
    ${paragraph(
      'We’re thrilled to have you on board. Your business account is verified and ready — here’s how to get started:',
    )}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #eef1f6;border-radius:14px;margin-bottom:28px;">
      <tr>
        <td style="padding:22px 24px;">
          <p style="margin:0 0 12px 0;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Quick start guide</p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="color:#475569;font-size:14px;line-height:1.7;">
            <tr><td style="padding:4px 0;">①&nbsp;&nbsp;Set up your <strong style="color:#0f172a;">branches</strong> and define your branding</td></tr>
            <tr><td style="padding:4px 0;">②&nbsp;&nbsp;Invite your <strong style="color:#0f172a;">team members</strong> and assign roles</td></tr>
            <tr><td style="padding:4px 0;">③&nbsp;&nbsp;Create your first <strong style="color:#0f172a;">loan products</strong></td></tr>
            <tr><td style="padding:4px 0;">④&nbsp;&nbsp;Explore the <strong style="color:#0f172a;">Distribution Hub</strong> for member onboarding</td></tr>
          </table>
        </td>
      </tr>
    </table>
    ${ctaButton(dashboardUrl, 'Go to Dashboard')}
    ${helperNote('Need help getting started? Our support team is just an email away.')}
  `;
  return getBaseTemplate(content, 'Welcome to FinFlo', logoUrl);
};

/**
 * Super Admin: New Business Registration Template
 */
const superAdminNewRegistrationEmail = (userData) => {
  const usersUrl = `${process.env.CLIENT_URL || 'https://finflo.org'}/admin/users`;
  const rows = [
    detailRow('Business Name', userData.name, { capitalize: true }),
    detailRow('Email Address', userData.email, { color: DEFAULT_COLOR }),
    detailRow('Registration Date', new Date().toLocaleString()),
  ].join('');

  const content = `
    ${heading('New business registered')}
    ${paragraph('A new business has just registered on the platform. Review the details below:')}
    ${infoCard(rows)}
    ${ctaButton(usersUrl, 'Manage Users')}
  `;
  return getBaseTemplate(content, 'FinFlo: New Registration Notification');
};

/**
 * Super Admin: Subscription Update Template
 */
const superAdminSubscriptionNotificationEmail = (userData, planName) => {
  const usersUrl = `${process.env.CLIENT_URL || 'https://finflo.org'}/admin/users`;
  const rows = [
    detailRow('Business Name', userData.name, { capitalize: true }),
    detailRow('Email Address', userData.email, { color: DEFAULT_COLOR }),
    detailRow('New Plan', planName, { color: '#16a34a', weight: 800 }),
    detailRow('Update Date', new Date().toLocaleString()),
  ].join('');

  const content = `
    ${heading('Subscription update', '#16a34a')}
    ${paragraph('A business has just updated their subscription plan.')}
    ${infoCard(rows)}
    ${ctaButton(usersUrl, 'View User Details')}
  `;
  return getBaseTemplate(content, 'Subscription Plan Update Notification');
};

/**
 * Generic broadcast / admin announcement email. Wraps admin-authored body
 * content in the standard branded shell. Body may be plain text (newlines
 * preserved) or trusted HTML — caller decides via `bodyHtml`. The caller is
 * expected to sanitize untrusted markup; this template does NOT escape.
 */
const broadcastEmail = ({
  title = 'A message from your account team',
  greeting = 'Hello,',
  bodyHtml,
  bodyText,
  businessName = null,
  logoUrl = null,
  brandColor = null,
}) => {
  const safeBody = bodyHtml
    ? bodyHtml
    : (bodyText || '')
        .split(/\n\n+/)
        .map(
          (para) =>
            `<p style="margin:0 0 16px 0;color:#475569;font-size:15px;line-height:1.65;">${para
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br/>')}</p>`,
        )
        .join('\n');

  const content = `
    ${heading(title)}
    <p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.65;">${greeting}</p>
    ${safeBody}
  `;
  return getBaseTemplate(content, title, logoUrl, businessName, brandColor);
};

/**
 * Generic one-time-code / OTP email (e.g. transaction-PIN reset). Reuses the
 * verification code block but with caller-supplied heading and message so it
 * isn't tied to signup copy. Supports white-label branding.
 */
const otpEmail = (code, opts = {}) => {
  const {
    heading: headingText = 'Your verification code',
    message = 'Use the one-time code below to continue. It expires in 10 minutes.',
    name = null,
    businessName = null,
    logoUrl = null,
    brandColor = null,
  } = opts;

  const content = `
    ${name ? greetingLine(name) : ''}
    ${heading(headingText)}
    ${paragraph(message)}
    ${codeBlock(code)}
    ${helperNote('If you didn’t request this, you can safely ignore this email — no changes will be made.')}
  `;
  return getBaseTemplate(content, headingText, logoUrl, businessName, brandColor);
};

/**
 * Landing-page contact / lead notification (sent to the support inbox).
 * `message` is visitor-supplied free text, so it is HTML-escaped.
 */
const contactLeadEmail = ({ name, email, message }) => {
  const rows = [
    detailRow('Name', escapeHtml(name), { capitalize: true }),
    detailRow('Email', escapeHtml(email), { color: DEFAULT_COLOR }),
  ].join('');

  const content = `
    ${heading('New landing page lead')}
    ${paragraph('You have a new contact inquiry from the landing page:')}
    ${infoCard(rows)}
    <p style="margin:0 0 8px 0;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Message</p>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.65;background-color:#f8fafc;border:1px solid #eef1f6;border-radius:12px;padding:16px;">${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
  `;
  return getBaseTemplate(content, 'New Landing Page Lead');
};

/**
 * Member Invitation Template — a tenant invites a prospective member by email.
 * The CTA links to a tokenized accept-invite page where the invitee finishes
 * setting up their account. White-label branded (brand name / logo / color).
 */
const memberInviteEmail = (
  inviteUrl,
  { businessName = null, logoUrl = null, brandColor = null, invitedByName = null } = {},
) => {
  const brand = businessName || 'us';
  const color = brandColor || DEFAULT_COLOR;
  const content = `
    ${heading("You're invited to join")}
    ${paragraph(
      `${invitedByName ? `<strong style="color:#0f172a;text-transform:capitalize;">${escapeHtml(invitedByName)}</strong> has invited you` : 'You have been invited'} to join <strong style="color:#0f172a;text-transform:capitalize;">${escapeHtml(brand)}</strong> as a member. Click the button below to set up your account and get started.`,
    )}
    ${ctaButton(inviteUrl, 'Accept Invitation', color)}
    ${paragraph('Or paste this link into your browser:', '#94a3b8')}
    <p style="margin:0 0 8px 0;color:${color};font-size:12px;word-break:break-all;font-family:monospace;background-color:#f8fafc;border:1px solid #eef1f6;padding:14px;border-radius:10px;">${inviteUrl}</p>
    ${helperNote('This invitation expires in 7 days. If you weren’t expecting it, you can safely ignore this email.')}
  `;
  return getBaseTemplate(
    content,
    'You’re Invited',
    logoUrl,
    businessName,
    brandColor,
  );
};

/**
 * Branded SMTP / email-delivery test (admin diagnostic). Honors the tenant's
 * brand so the test reflects what their members will actually receive.
 */
const smtpTestEmail = (brandName = null, logoUrl = null, brandColor = null) => {
  const content = `
    ${heading('Email delivery is working ✅', '#16a34a')}
    ${paragraph(
      'If you’re reading this, your email configuration is set up correctly and messages are being delivered.',
    )}
    ${helperNote(`Sent on ${new Date().toLocaleString()}`)}
  `;
  return getBaseTemplate(
    content,
    'Email Connection Test',
    logoUrl,
    brandName,
    brandColor,
  );
};

module.exports = {
  verificationEmail,
  passwordResetEmail,
  welcomeBusinessEmail,
  loanReminderEmail,
  transactionEmail,
  memberApprovalEmail,
  superAdminNewRegistrationEmail,
  superAdminSubscriptionNotificationEmail,
  broadcastEmail,
  otpEmail,
  contactLeadEmail,
  memberInviteEmail,
  smtpTestEmail,
};
