const pino = require('pino');

const env = process.env.NODE_ENV;
const isProd = env === 'production';
const isTest = env === 'test';

// Structured application logger (pino). Replaces ad-hoc console.* so logs are
// queryable JSON with levels and correlation, and so secrets/PII are redacted in
// one place. The app encrypts CNIC/bank fields at rest — logs must not undo that,
// hence the redact list below.
//
// Level defaults: silent in tests (keep the suite quiet), debug locally, info in
// prod. Override with LOG_LEVEL.
const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : isProd ? 'info' : 'debug'),
  base: undefined, // drop pid/hostname noise
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'pin',
      'transactionPin',
      'token',
      'cnic',
      'accountNumber',
      'bankAccountNumber',
      '*.password',
      '*.pin',
      '*.transactionPin',
      '*.token',
      '*.cnic',
    ],
    censor: '[redacted]',
  },
});

module.exports = logger;
