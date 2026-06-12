const crypto = require('crypto');
const logger = require('../utils/logger');
const { captureException } = require('../config/sentry');

module.exports = (err, req, res, next) => {
  // Always log server-side with a correlation ID; never leak internals to clients.
  const correlationId = crypto.randomBytes(6).toString('hex');
  const statusCode = err.http_code || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error(
    {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      err,
    },
    `${req.method} ${req.originalUrl} - ${err.message}`,
  );

  // Report genuine server faults (5xx) to Sentry; 4xx are expected client/
  // validation errors and would just be noise.
  if (statusCode >= 500) {
    captureException(err, { tags: { correlationId }, extra: { url: req.originalUrl } });
  }

  // For 4xx errors the message is usually safe (validation feedback, e.g.
  // "Insufficient balance"). For 5xx errors in production return a generic
  // message — Mongoose/Stripe/internal errors often expose schema names,
  // query shapes, and file paths.
  let clientMessage;
  if (statusCode < 500) {
    clientMessage = err.message || 'Bad Request';
  } else if (isProd) {
    clientMessage = 'An internal server error occurred. Please contact support with the correlation ID.';
  } else {
    clientMessage = err.message || 'Internal Server Error';
  }

  const body = {
    message: clientMessage,
    correlationId,
  };
  if (!isProd) {
    body.stack = err.stack;
  }
  res.status(statusCode).json(body);
};
