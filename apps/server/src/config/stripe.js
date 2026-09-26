let client;
let configuredKey;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client || configuredKey !== key) {
    client = require('stripe')(key);
    configuredKey = key;
  }
  return client;
};

module.exports = { getStripe };
