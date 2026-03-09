/**
 * Centralized Email Templates for Financial Intelligence Portal
 */

const getBaseTemplate = (
  content,
  title,
  logoUrl = null,
  customBrandName = null,
) => {
  const brandName = customBrandName || process.env.FROM_NAME || 'FinFlo';
  const primaryColor = '#2563eb'; // Modern Blue

  // Use custom logo if provided, otherwise fallback to default
  const logoPath =
    logoUrl ||
    'https://res.cloudinary.com/dzfcf4sqf/image/upload/v1772130786/favicon_m58hqu.png';

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
const verificationEmail = (code, businessName = null, logoUrl = null) => {
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
  return getBaseTemplate(content, 'Verify Your Email', logoUrl, businessName);
};

/**
 * Password Reset Template
 */
const passwordResetEmail = (resetUrl, businessName = null, logoUrl = null) => {
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
  const accentColor = isOverdue ? '#dc2626' : '#2563eb';
  const title = isOverdue
    ? 'URGENT: Overdue Payment'
    : 'Upcoming Payment Reminder';

  const content = `
    <h2 style="margin: 0 0 16px 0; color: ${accentColor}; font-size: 18px; font-weight: 700;">${title}</h2>
    <p style="margin: 0 0 24px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
      Dear <span style="font-weight: 700; text-transform: capitalize;">${customerName}</span>,
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
          <a href="${`${process.env.CLIENT_URL}/member/login` || 'https://www.finflo.org/member/login'}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-transform: uppercase;">View Account</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center;">
      If you have already made this payment, please disregard this automated reminder.
    </p>
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

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 700;">Transaction Confirmation</h2>
    <p style="margin: 0 0 24px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
      Dear <span style="font-weight: 700; text-transform: capitalize;">${memberName}</span>,
    </p>
    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
      This is to confirm that a **${transactionType}** transaction has been successfully processed for your account at **${branchName}**.
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Transaction Type</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${transactionType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount</td>
          <td align="right" style="padding: 8px 0; color: #2563eb; font-size: 14px; font-weight: 800;">${currency}${amount}</td>
        </tr>
        ${
          data.senderName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Sender</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-transform: capitalize;">${data.senderName}</td>
        </tr>`
            : ''
        }
        ${
          data.recipientName
            ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Recipient</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-transform: capitalize;">${data.recipientName}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px;">${date}</td>
        </tr>
        ${
          reference
            ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Reference ID</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px;">${reference}</td>
        </tr>`
            : ''
        }
        ${
          balance !== undefined && balance !== null
            ? `
        <tr style="border-top: 1px solid #f1f5f9;">
          <td style="padding: 16px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 700;">Current Balance</td>
          <td align="right" style="padding: 16px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 800;">${currency}${balance}</td>
        </tr>`
            : ''
        }
      </table>
    </div>

    <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center;">
      Thank you for choosing **${branchName}** for your financial needs.
    </p>
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
  const title = isApproved ? 'Account Approved!' : 'Registration Update';

  const content = `
    <h2 style="margin: 0 0 16px 0; color: ${accentColor}; font-size: 18px; font-weight: 700;">${title}</h2>
    <p style="margin: 0 0 24px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
      Dear <span style="font-weight: 700; text-transform: capitalize;">${memberName}</span>,
    </p>
    <p style="margin: 0 0 32px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
      ${
        isApproved
          ? 'Great news! Your membership account has been <strong>approved</strong>. You can now log in to your member portal and access all features.'
          : 'We have reviewed your registration request. Unfortunately, your account has been <strong>rejected</strong> at this time. Please contact your branch administrator for more information.'
      }
    </p>
    ${
      isApproved
        ? `<table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 32px;">
          <a href="${process.env.CLIENT_URL || 'https://www.finflo.org'}/member/login" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Login to Member Portal</a>
        </td>
      </tr>
    </table>`
        : ''
    }
    <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center;">
      If you have any questions, please reach out to your branch administrator.
    </p>
  `;
  return getBaseTemplate(content, title, logoUrl, businessName || null);
};

/**
 * Business Welcome Email Template
 */
const welcomeBusinessEmail = (businessName, logoUrl = null) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #2563eb; font-size: 18px; font-weight: 700;">Welcome to FinFlo!</h2>
    <p style="margin: 0 0 24px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
      Dear <span style="font-weight: 700; text-transform: capitalize;">${businessName}</span>,
    </p>
    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
      We're thrilled to have you on board! Your business account has been successfully verified, and you're now ready to revolutionize your financial operations.
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Quick Start Guide:</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #64748b; font-size: 14px; line-height: 1.8;">
        <li>Set up your <strong>Branches</strong> and define your branding.</li>
        <li>Invite your <strong>Team Members</strong> and assign roles.</li>
        <li>Create your first <strong>Loan Products</strong>.</li>
        <li>Explore the <strong>Distribution Hub</strong> for member registration.</li>
      </ul>
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 32px;">
          <a href="${process.env.CLIENT_URL || 'https://www.finflo.org'}/dashboard" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Go to Dashboard</a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center;">
      Need help? Our support team is just an email away.
    </p>
  `;
  return getBaseTemplate(content, 'Welcome to FinFlo', logoUrl);
};

/**
 * Super Admin: New Business Registration Template
 */
const superAdminNewRegistrationEmail = (userData) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 700;">New Business Registered</h2>
    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
      A new business has just registered on the platform. Review the details below:
    </p>
    
    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Business Name</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-transform: capitalize;">${userData.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email Address</td>
          <td align="right" style="padding: 8px 0; color: #2563eb; font-size: 14px; font-weight: 700;">${userData.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Registration Date</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 32px;">
          <a href="${process.env.CLIENT_URL || 'https://www.finflo.org'}/admin/users" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Manage Users</a>
        </td>
      </tr>
    </table>
  `;
  return getBaseTemplate(
    content,
    'FinFlo: New Registration Notification',
    null,
  );
};

/**
 * Super Admin: Subscription Update Template
 */
const superAdminSubscriptionNotificationEmail = (userData, planName) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #16a34a; font-size: 18px; font-weight: 700;">New Subscription Update</h2>
    <p style="margin: 0 0 24px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
      Great news! A business has updated their subscription plan.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Business Name</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-transform: capitalize;">${userData.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email Address</td>
          <td align="right" style="padding: 8px 0; color: #2563eb; font-size: 14px; font-weight: 700;">${userData.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">New Plan</td>
          <td align="right" style="padding: 8px 0; color: #16a34a; font-size: 14px; font-weight: 800;">${planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Update Date</td>
          <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px;">${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 32px;">
          <a href="${process.env.CLIENT_URL || 'https://www.finflo.org'}/admin/users" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-transform: uppercase;">View User Details</a>
        </td>
      </tr>
    </table>
  `;
  return getBaseTemplate(
    content,
    'Subscription Plan Update Notification',
    null,
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
};
