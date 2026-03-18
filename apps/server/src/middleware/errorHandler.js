module.exports = (err, req, res, next) => {
  console.error('Global Error Handler:', err);
  if (err.stack) console.error(err.stack);

  const statusCode = err.http_code || err.status || 500;

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
