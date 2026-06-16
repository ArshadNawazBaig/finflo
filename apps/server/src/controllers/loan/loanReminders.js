const mongoose = require('mongoose');
const Loan = require('../../models/Loan');
const Customer = require('../../models/Customer');
const Repayment = require('../../models/Repayment');
const FinancialTransaction = require('../../models/FinancialTransaction');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Member = require('../../models/Member');
const Investment = require('../../models/Investment');
const Branch = require('../../models/Branch');
const LoanProduct = require('../../models/LoanProduct');
const SystemSettings = require('../../models/SystemSettings');
const { canCreateLoan } = require('../../utils/planLimits');
const { calculateRiskScore } = require('../../utils/riskService');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../../utils/notificationHelper');
const { logActivity } = require('../activityLogController');
const { escapeRegExp } = require('../../utils/stringUtils');
const { generateAmortizationSchedule } = require('../../utils/amortizationUtils');
const loanRepaymentService = require('../../services/loanRepaymentService');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const { transactionEmail } = require('../../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../../utils/balanceUtils');
const {
  updateMemberCreditLimit,
  calculateCreditLimit,
} = require('../../services/creditLimitService');
const {
  computeCreditScore,
  refreshCreditScore,
} = require('../../services/creditScoringService');
const { getEmailBranding } = require('../../utils/brandingUtils');
const { roundMoney } = require('../../utils/money');

// Loan interest/term math now lives in utils/loanMath.js so the group-lending
// service computes EMI/totalAmount from the same source of truth as these flows.
const {
  calculateEMI,
  calculateSimpleInterest,
  calculateCompoundInterest,
  computeLoanTerms,
} = require('../../utils/loanMath');
/**
 * @desc    Send payment reminder emails to many loan holders in one request.
 * @route   POST /api/loans/send-bulk-reminders
 * @access  Private (Admin/Staff)
 *
 * Accepts: { recipients: [{ customerEmail, customerName, amount, dueDate, isOverdue, id? }, ...] }
 * Fans out with bounded concurrency (5 at a time) so SMTP rate limits and the
 * request timeout don't blow up on a 30+ recipient batch. Returns a per-recipient
 * pass/fail summary so the UI can report exactly what got through.
 */
const sendBulkPaymentReminders = async (req, res) => {
  try {
    const { recipients } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'recipients must be a non-empty array' });
    }

    const { loanReminderEmail } = require('../../utils/emailTemplates');
    const { format } = require('date-fns');

    const reminderUser = await User.findById(req.user.effectiveOwnerId).select(
      'businessName name businessLogo',
    );
    const reminderBrand = reminderUser
      ? reminderUser.businessName || reminderUser.name
      : null;
    const reminderLogo = reminderUser?.businessLogo;

    const sendOne = async (r) => {
      const id = r.id || r.customerEmail || 'unknown';
      try {
        if (!r.customerEmail || !r.customerName || !r.amount || !r.dueDate) {
          return { id, email: r.customerEmail || null, ok: false, reason: 'Missing required fields' };
        }
        const formattedDate = format(new Date(r.dueDate), 'MMMM d, yyyy');
        const formattedAmount = Number(r.amount).toLocaleString();
        const subject = r.isOverdue
          ? `URGENT: Overdue Loan Repayment — ${formattedDate}`
          : `Upcoming Loan Repayment Reminder — ${formattedDate}`;

        const ok = await sendEmail({
          to: r.customerEmail,
          subject,
          html: loanReminderEmail(
            r.customerName,
            `Rs. ${formattedAmount}`,
            formattedDate,
            r.isOverdue ? 'overdue' : 'upcoming',
            reminderBrand,
            reminderLogo,
          ),
        });

        return ok
          ? { id, email: r.customerEmail, ok: true }
          : { id, email: r.customerEmail, ok: false, reason: 'SMTP send failed' };
      } catch (err) {
        return { id, email: r.customerEmail || null, ok: false, reason: err.message };
      }
    };

    // Bounded parallelism: process in chunks of 5.
    const CHUNK = 5;
    const results = [];
    for (let i = 0; i < recipients.length; i += CHUNK) {
      const slice = recipients.slice(i, i + CHUNK);
      const settled = await Promise.all(slice.map(sendOne));
      results.push(...settled);
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    res.json({
      sent,
      failed,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('sendBulkPaymentReminders Error:', error);
    res.status(500).json({ message: 'Failed to send bulk reminders' });
  }
};

/**
 * @desc    Send a payment reminder email to a loan holder/customer
 * @route   POST /api/loans/send-reminder
 * @access  Private (Admin/Staff)
 */
const sendPaymentReminder = async (req, res) => {
  try {
    const { customerEmail, customerName, amount, dueDate, isOverdue } =
      req.body;

    if (!customerEmail || !customerName || !amount || !dueDate) {
      return res.status(400).json({
        message:
          'Missing required fields: customerEmail, customerName, amount, dueDate',
      });
    }

    const { loanReminderEmail } = require('../../utils/emailTemplates');
    const { format } = require('date-fns');

    const formattedDate = format(new Date(dueDate), 'MMMM d, yyyy');
    const formattedAmount = Number(amount).toLocaleString();

    const subject = isOverdue
      ? `URGENT: Overdue Loan Repayment — ${formattedDate}`
      : `Upcoming Loan Repayment Reminder — ${formattedDate}`;

    const reminderUser = await User.findById(req.user.effectiveOwnerId).select(
      'businessName name businessLogo',
    );
    const reminderBrand = reminderUser
      ? reminderUser.businessName || reminderUser.name
      : null;

    const emailSent = await sendEmail({
      to: customerEmail,
      subject,
      html: loanReminderEmail(
        customerName,
        `Rs. ${formattedAmount}`,
        formattedDate,
        isOverdue ? 'overdue' : 'upcoming',
        reminderBrand,
        reminderUser?.businessLogo,
      ),
    });

    if (!emailSent) {
      return res.status(500).json({
        message: 'Failed to send email. Check SMTP configuration.',
      });
    }

    res.json({
      success: true,
      message: `Reminder email sent to ${customerEmail}`,
    });
  } catch (error) {
    console.error('sendPaymentReminder Error:', error);
    res.status(500).json({ message: 'Failed to send reminder email' });
  }
};

module.exports = {
  sendBulkPaymentReminders,
  sendPaymentReminder,
};
