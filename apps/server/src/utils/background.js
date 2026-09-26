const { waitUntil } = require('@vercel/functions');
const { isServerless } = require('../config/runtime');

// Register noncritical work with the function lifecycle instead of losing it at response end.
const background = (promise) => {
  if (isServerless()) waitUntil(promise);
  return promise;
};

module.exports = { background };
