/**
 * List of common disposable email domains to block
 * This is a basic list and can be expanded or replaced with a service/library
 */
const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'guerrillamail.com',
  'temp-mail.org',
  '10minutemail.com',
  'discard.email',
  'getairmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'spam4.me',
  'grr.la',
  'guerrillamail.de',
  'yopmail.com',
  'dispostable.com',
  'trashmail.com',
  'maildrop.cc',
  'burners-email.com',
  'fake-email.com',
];

/**
 * Validates if an email is in a valid format and not from a disposable domain
 * @param {string} email - The email address to validate
 * @returns {Object} - { isValid: boolean, message: string }
 */
const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  const lowercaseEmail = email.toLowerCase().trim();

  // Basic regex for email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lowercaseEmail)) {
    return { isValid: false, message: 'Invalid email format' };
  }

  const domain = lowercaseEmail.split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return {
      isValid: false,
      message:
        'Disposable email addresses are not allowed. Please use a real email provider.',
    };
  }

  return { isValid: true, message: 'Email is valid' };
};

module.exports = {
  validateEmail,
  DISPOSABLE_DOMAINS,
};
