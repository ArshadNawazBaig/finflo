/**
 * Handles MongoDB Errors (e.g. E11000 Duplicate Key)
 * @param {Error} error - Raw error object from Mongoose/MongoDB
 * @returns {string} - User-friendly error message
 */
const getFriendlyErrorMessage = (error) => {
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
};
