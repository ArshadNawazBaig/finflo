/**
 * Detects database connectivity / timeout errors so we can surface a clean,
 * non-technical message to the user instead of raw Mongoose strings like
 * `Operation \`users.findOne()\` buffering timed out after 10000ms`.
 */
const isDatabaseUnavailable = (error) => {
  if (!error) return false;
  const msg = String(error.message || '');
  if (
    error.name === 'MongooseServerSelectionError' ||
    error.name === 'MongoNetworkError' ||
    error.name === 'MongoTimeoutError'
  ) {
    return true;
  }
  return (
    msg.includes('buffering timed out') ||
    msg.includes('failed to connect') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('topology was destroyed')
  );
};

/**
 * Handles MongoDB Errors (e.g. E11000 Duplicate Key)
 * @param {Error} error - Raw error object from Mongoose/MongoDB
 * @returns {string} - User-friendly error message
 */
const getFriendlyErrorMessage = (error) => {
  if (isDatabaseUnavailable(error)) {
    return 'Our service is temporarily unreachable. Please check your connection and try again in a moment.';
  }

  if (error.code === 11000) {
    const keyPattern = error.keyPattern || {};
    if (keyPattern.email)
      return 'A customer with this email address already exists.';
    if (keyPattern.cnic)
      return 'A customer with this CNIC / ID Number already exists.';

    const field = Object.keys(keyPattern)[0];
    return `A duplicate value was found for: ${field}`;
  }

  if (error.name === 'ValidationError') {
    return Object.values(error.errors)
      .map((val) => val.message)
      .join(', ');
  }

  return error.message || 'An unexpected error occurred.';
};

module.exports = {
  getFriendlyErrorMessage,
  isDatabaseUnavailable,
};
