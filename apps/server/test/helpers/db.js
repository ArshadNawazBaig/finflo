/**
 * DB helpers shared across test files. The connection lifecycle itself is owned
 * by globalSetup.js + setup.js; this module only exposes small conveniences.
 */
const mongoose = require('mongoose');

/** Wipe every collection — handy for an explicit reset mid-test if ever needed. */
async function clearCollections() {
  if (mongoose.connection.readyState !== 1) return;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

module.exports = { clearCollections, mongoose };
