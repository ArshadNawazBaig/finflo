import { format } from 'date-fns';
import { formatCurrency } from './utils';

/**
 * Generates a WhatsApp link with a pre-filled reminder message.
 * @param {string} phone - Customer's phone number
 * @param {string} customerName - Customer's name
 * @param {number} amount - Amount due
 * @param {Date|string} dueDate - Due date
 * @param {boolean} isOverdue - Whether the payment is overdue
 * @returns {string} - The WhatsApp URL
 */
export const generateWhatsAppLink = (
  phone,
  customerName,
  amount,
  dueDate,
  isOverdue = false,
) => {
  // Clean phone number: remove non-digits
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

  // Ensure country code (assuming PK +92 if not present and length is 10-11)
  let finalPhone = cleanPhone;
  if (cleanPhone.startsWith('0')) {
    finalPhone = '92' + cleanPhone.substring(1);
  } else if (cleanPhone.length === 10) {
    finalPhone = '92' + cleanPhone;
  }

  const formattedDate = format(new Date(dueDate), 'MMMM d, yyyy');
  const formattedAmount = formatCurrency(amount);

  const message = isOverdue
    ? `Assalamu Alaikum ${customerName}, this is a reminder regarding your loan payment of ${formattedAmount} which was due on ${formattedDate}. It is currently *OVERDUE*. Please settle it as soon as possible. JazakAllah.`
    : `Assalamu Alaikum ${customerName}, this is a friendly reminder for your upcoming loan payment of ${formattedAmount} due on ${formattedDate}. JazakAllah.`;

  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Generates a mailto link with a pre-filled reminder message.
 * @param {string} email - Customer's email address
 * @param {string} customerName - Customer's name
 * @param {number} amount - Amount due
 * @param {Date|string} dueDate - Due date
 * @param {boolean} isOverdue - Whether the payment is overdue
 * @returns {string} - The mailto URL
 */
export const generateEmailLink = (
  email,
  customerName,
  amount,
  dueDate,
  isOverdue = false,
) => {
  const formattedDate = format(new Date(dueDate), 'MMMM d, yyyy');
  const formattedAmount = formatCurrency(amount);

  const subject = isOverdue
    ? `URGENT: Overdue Loan Repayment - ${customerName}`
    : `Upcoming Loan Repayment Reminder - ${formattedDate}`;

  const body = isOverdue
    ? `Dear ${customerName},

This is an urgent reminder regarding your loan repayment of ${formattedAmount} which was due on ${formattedDate}. 

Our records indicate that this payment is currently OVERDUE. Please arrange for the settlement of this amount as soon as possible to avoid any penalties or impact on your credit status.

If you have already made the payment, please disregard this email or send us a copy of the receipt.

Best regards,
FinFlow Team`
    : `Dear ${customerName},

This is a friendly reminder regarding your upcoming loan repayment of ${formattedAmount} which is due on ${formattedDate}.

To ensure smooth processing, please ensure the funds are available by the due date.

Thank you for your continued partnership.

Best regards,
FinFlow Team`;

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
