/**
 * Escapes special characters in a string for use in a Regular Expression.
 * Preventing NoSQL regex injection.
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
const escapeRegExp = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

module.exports = {
  escapeRegExp,
};
