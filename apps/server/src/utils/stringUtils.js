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

/**
 * Capitalizes the first letter of every word in a person's name so it reads
 * properly in notifications/messages (e.g. "john doe" → "John Doe").
 * Only the leading letter of each word is upper-cased — existing intra-word
 * caps are preserved so names like "McDonald" or "bin Ahmed" aren't mangled.
 * Word boundaries are start-of-string, whitespace, apostrophes and hyphens.
 * Non-string / empty input returns '' so it's safe to interpolate.
 * @param {string} value
 * @returns {string}
 */
const capitalizeName = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(
    /(^|[\s'-])([a-zà-ɏ])/g,
    (_match, boundary, letter) => boundary + letter.toUpperCase(),
  );
};

module.exports = {
  escapeRegExp,
  capitalizeName,
};
