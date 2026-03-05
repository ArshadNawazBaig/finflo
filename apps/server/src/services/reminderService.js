const cron = require('node-cron');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { loanReminderEmail } = require('../utils/emailTemplates');
const { generateAmortizationSchedule } = require('../utils/amortizationUtils');

/**
 * FinFlo: Automated Communication Engine
 * Scans active loans and sends reminders/alerts.
 */
const runReminderService = async () => {
  console.log('FinFlo: Starting daily automated reminder scan...');

  try {
    const activeLoans = await Loan.find({ status: 'active' }).populate(
      'customer',
    );

    for (const loan of activeLoans) {
      if (!loan.customer) continue;

      const schedule = generateAmortizationSchedule(loan);
      const paidAmount = loan.paidAmount || 0;
      const emi = loan.emi;

      // Calculate how many installments have been paid based on total paid amount
      const paidCount = Math.floor(paidAmount / emi);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const item of schedule) {
        // Skip already paid installments
        if (item.installment <= paidCount) continue;

        const dueDate = new Date(item.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 1. Upcoming Reminder (3 days before)
        if (diffDays === 3) {
          await sendReminder(loan, item, 'upcoming');
        }

        // 2. Overdue Alert (1 day after due date)
        if (diffDays === -1) {
          await sendReminder(loan, item, 'overdue');
        }
      }
    }
    console.log('FinFlo: Completed daily scan.');
  } catch (error) {
    console.error('FinFlo Error during reminder scan:', error);
  }
};

const sendReminder = async (loan, installment, type) => {
  // Prevent duplicate reminders for the same installment and type
  const alreadySent = loan.automatedReminders?.find(
    (ref) =>
      ref.type === type && ref.installmentNumber === installment.installment,
  );

  if (alreadySent) return;

  const customer = loan.customer;
  const amount = installment.amount;
  const dateStr = new Date(installment.dueDate).toLocaleDateString();

  const title =
    type === 'upcoming'
      ? 'Upcoming Payment Reminder'
      : 'URGENT: Overdue Payment Alert';

  const message =
    type === 'upcoming'
      ? `Dear ${customer.name}, this is a friendly reminder for your upcoming loan payment of ${amount} due on ${dateStr}.`
      : `Dear ${customer.name}, your payment of ${amount} due on ${dateStr} is now OVERDUE. Please settle it immediately.`;

  try {
    // 1. Internal Notification
    if (customer.isMember && customer.memberId) {
      const notification = new Notification({
        recipient: customer.memberId,
        recipientModel: 'Member',
        title,
        message,
        type: type === 'upcoming' ? 'info' : 'warning',
        link: '/member/loans', // Direct link to loans list
        branchId: loan.branchId,
      });
      await notification.save();
    }

    // 2. Email Notification
    if (customer.email) {
      await sendEmail({
        email: customer.email,
        subject: title,
        message: message + '\n\nBest regards,\nFinFlo Team',
        html: loanReminderEmail(customer.name, amount, dateStr, type),
      });
    }

    // 3. Update Loan state to record communication
    loan.automatedReminders.push({
      type,
      installmentNumber: installment.installment,
      sentAt: new Date(),
    });
    await loan.save();
  } catch (err) {
    console.error(
      `FinFlo: Failed to send ${type} reminder for Loan ${loan._id}:`,
      err,
    );
  }
};

// Initialize FinFlo (Run daily at midnight)
const initFinanceFlow = () => {
  cron.schedule(
    '0 0 * * *',
    () => {
      runReminderService();
    },
    {
      timezone: 'UTC', // Or system default
    },
  );
  console.log('FinFlo: Automated Communication Engine initialized.');
};

module.exports = { initFinanceFlow, runReminderService };
