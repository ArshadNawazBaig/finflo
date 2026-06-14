/**
 * Safe parsers for untrusted query-string parameters.
 *
 * Query values arrive as strings (or, under operator-injection attempts,
 * arrays/objects). These helpers coerce them to the intended primitive with a
 * fallback, so controllers stop doing brittle `req.query.x === 'true'` and
 * `parseInt(req.query.page) || 1` by hand.
 */

/**
 * Parse a boolean-ish query value. Treats `'true'`/`'1'`/`'yes'`/`'on'`
 * (case-insensitive) and real `true` as true; everything else uses the
 * default when the value is absent, or false when it's a present non-truthy
 * string.
 * @param {*} val - The raw query value.
 * @param {boolean} [defaultVal=false] - Returned when `val` is undefined/null/''.
 * @returns {boolean}
 */
const parseBoolean = (val, defaultVal = false) => {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return defaultVal;
};

/**
 * Parse a strictly-positive integer, rejecting non-numbers, zero, negatives,
 * and floats. Useful for `page`, `limit`, and id-like counts.
 * @param {*} val - The raw query value.
 * @param {number} [defaultVal=1] - Returned when `val` is invalid.
 * @returns {number} A positive integer.
 */
const parsePositiveInt = (val, defaultVal = 1) => {
  const n = Number(val);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return defaultVal;
  return n;
};

/**
 * Normalise a sort-direction query value to Mongo's `1` / `-1`.
 * Accepts `'asc'`/`'ascending'`/`'1'` → `1`; everything else → `-1`.
 * @param {*} val - The raw query value.
 * @returns {1 | -1}
 */
const parseSortOrder = (val) => {
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'asc' || s === 'ascending' || s === '1' ? 1 : -1;
};

/**
 * Build pagination params from a query object, clamped to sane bounds.
 * @param {Record<string, any>} [query={}] - The Express `req.query`.
 * @param {object} [options]
 * @param {number} [options.defaultLimit=10] - Page size when unspecified.
 * @param {number} [options.maxLimit=100] - Upper bound to prevent unbounded scans.
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = parsePositiveInt(query.page, 1);
  let limit = parsePositiveInt(query.limit, defaultLimit);
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = {
  parseBoolean,
  parsePositiveInt,
  parseSortOrder,
  parsePagination,
};
