/**
 * Vitest globalSetup — runs ONCE for the whole run, before any test file.
 *
 * Spins up a single in-memory MongoDB *replica set* (mongodb-memory-server) so
 * the production code's transactions / sessions execute for real, and exposes
 * its URI to the test workers via `process.env.MONGO_TEST_URI`. The returned
 * teardown stops the server after the last test file finishes.
 *
 * The per-file mongoose connection + per-test collection wipe live in setup.js.
 */
const { MongoMemoryReplSet } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_TEST_URI = replset.getUri();
  return async () => {
    await replset.stop();
  };
};
