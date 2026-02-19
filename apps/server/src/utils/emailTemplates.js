/**
 * Centralized Email Templates for Financial Intelligence Portal
 */

const getBaseTemplate = (content, title, logoUrl = null) => {
  const brandName = process.env.FROM_NAME || 'FinFlow';
  const primaryColor = '#2563eb'; // Modern Blue

  // Custom Cloudinary Logo
  const logoPath =
    logoUrl ||
    'https://res.cloudinary.com/dzfcf4sqf/image/upload/v1770996569/favicon_1_ciy1sn.png';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px 40px 20px 40px;">
                  <img src="${logoPath}" alt="${brandName}" width="64" height="64" style="margin-bottom: 16px;">
                  <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">${brandName}</h1>
                </td>
              </tr>

              <!-- Content Area -->
              <tr>
                <td style="padding: 0 40px 40px 40px;">
                  <div style="border-top: 1px solid #f1f5f9; padding-top: 32px;">
                    ${content}
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 32px 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                    © 2026 ${brandName} • Digital Finance Excellence
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">
                    This is an automated system message. Please do not reply directly.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Verification Email Template
 */
const verificationEmail = (code) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 700;">Verify Your Email</h2>
    <p style="margin: 0 0 32px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
      Thank you for joining our platform. To complete your secure registration, please enter the following 6-digit verification code:
    </p>
    <div style="background-color: #f1f5f9; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
      <span style="font-family: monospace; font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 12px; margin-left: 12px;">${code}</span>
    </div>
    <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center;">
      This code will expire in 10 minutes for your security.
    </p>
  `;
  return getBaseTemplate(content, 'Verify Your Email');
};

/**
 * Password Reset Template
 */
const passwordResetEmail = (resetUrl) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 700;">Password Recovery Request</h2>
    <p style="margin: 0 0 32px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
      A request was made to reset your security credentials. Click the button below to access the secure password reset gateway:
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 32px;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Reset Password</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
      Or copy and paste this secure link into your browser:
    </p>
    <p style="margin: 0; color: #2563eb; font-size: 11px; word-break: break-all; font-family: monospace; background-color: #f8fafc; padding: 12px; border-radius: 8px;">
      ${resetUrl}
    </p>
  `;
  return getBaseTemplate(content, 'Reset Your Password');
};

/**
 * ACE Loan Reminder Template
 */
const loanReminderEmail = (customerName, amount, dueDate, type) => {
  const isOverdue = type === 'overdue';
  const accentColor = isOverdue ? '#dc2626' : '#2563eb';
  const title = isOverdue
    ? 'URGENT: Overdue Payment'
    : 'Upcoming Payment Reminder';

  const content = `
    <h2 style="margin: 0 0 16px 0; color: ${accentColor}; font-size: 18px; font-weight: 700;">${title}</h2>
    <p style="margin: 0 0 24px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
      Dear ${customerName},
    </p>
    <p style="margin: 0 0 32px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
      ${
        isOverdue
          ? `Your loan installment of **${amount}** due on **${dueDate}** is now OVERDUE. Please settle this immediately to avoid penalties.`
          : `This is a friendly reminder for your upcoming loan installment of **${amount}** due on **${dueDate}**.`
      }
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 32px;">
          <a href="${process.env.CLIENT_URL || 'https://loan-master-client.vercel.app'}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-transform: uppercase;">View Account</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center;">
      If you have already made this payment, please disregard this automated reminder.
    </p>
  `;
  return getBaseTemplate(content, title);
};

module.exports = {
  verificationEmail,
  passwordResetEmail,
  loanReminderEmail,
};
