const app = require('../apps/server/src/index');
module.exports = app;
// Stripe verifies the original bytes; Express owns body parsing for all routes.
module.exports.config = { api: { bodyParser: false } };
