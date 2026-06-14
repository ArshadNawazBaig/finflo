/**
 * NoSQL operator-injection sanitiser.
 *
 * Strips keys that Mongo would interpret as operators (`$`-prefixed) or as
 * path traversal into nested/prototype fields (containing `.`) from request
 * input, neutralising payloads like `?status[$ne]=resolved` or
 * `{ "__proto__.x": 1 }`. Extracted from index.js so it can be unit-tested
 * and reused.
 */

/**
 * Recursively delete dangerous keys from a plain object/array, in place.
 * Keys starting with `$` (operator injection) or containing `.` (path
 * injection) are removed; nested objects are sanitised depth-first.
 * @param {*} obj - Any value; non-objects are ignored.
 * @returns {void} Mutates `obj` in place.
 */
const sanitizeMongoKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      try {
        delete obj[key];
      } catch {
        /* read-only — ignore */
      }
    } else if (obj[key] && typeof obj[key] === 'object') {
      sanitizeMongoKeys(obj[key]);
    }
  }
};

/**
 * Express middleware that sanitises `req.body`, `req.params`, and the values
 * within `req.query`.
 *
 * Express 5 makes `req.query` a getter (the container can't be reassigned),
 * but the nested values are still mutable — so we deep-sanitise each value to
 * catch operator injection in query strings such as `?status[$ne]=…`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const sanitizeRequest = (req, res, next) => {
  sanitizeMongoKeys(req.body);
  sanitizeMongoKeys(req.params);
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const v = req.query[key];
      if (v && typeof v === 'object') sanitizeMongoKeys(v);
    }
  }
  next();
};

module.exports = { sanitizeMongoKeys, sanitizeRequest };
