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
            <td align="center" style="background-color:${primaryColor};padding:36px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background-color:#ffffff;border-radius:14px;padding:10px;line-height:0;">
                    <img src="${logoPath}" alt="${brandName}" width="44" height="44" style="display:block;border-radius:8px;">
                  </td>
                </tr>
              </table>
              <div style="margin-top:14px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">${brandName}</div>
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
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td align="center" style="background-color:#f8fafc;border:1px solid #eef1f6;border-radius:14px;padding:28px 16px;">
          <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;font-weight:700;color:${DEFAULT_COLOR};letter-spacing:10px;padding-left:10px;">${code}</span>
        </td>
      </tr>
    </table>
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
) => {
  const isApproved = status === 'approved';
  const accentColor = isApproved ? '#16a34a' : '#dc2626';
  const title = isApproved ? 'Account Approved' : 'Registration Update';
  const portalUrl = `${process.env.CLIENT_URL || 'https://finflo.org'}/member/login`;

  const content = `
    ${heading(title, accentColor)}
    ${greetingLine(memberName)}
    ${paragraph(
      isApproved
        ? 'Great news — your membership account has been <strong style="color:#16a34a;">approved</strong>. You can now log in to your member portal and access all features.'
        : 'We’ve reviewed your registration request. Unfortunately, your account could not be approved at this time. Please contact your branch administrator for more information.',
    )}
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
};
