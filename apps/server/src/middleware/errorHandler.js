const crypto = require('crypto');

module.exports = (err, req, res, next) => {
  // Always log server-side with a correlation ID; never leak internals to clients.
  const correlationId = crypto.randomBytes(6).toString('hex');
  console.error(`[${correlationId}] ${req.method} ${req.originalUrl} - ${err.message}`);
  if (err.stack) console.error(err.stack);

  const statusCode = err.http_code || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

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
