/**
 * Vitest setupFile — runs before every test file (Test API is global via
 * `globals: true`). Connects mongoose once to the shared replica set started in
 * globalSetup.js, and wipes every collection before each test so cases stay
 * isolated. Because vitest runs with `isolate: false` + `fileParallelism: false`,
 * one mongoose connection is reused across all files; the `readyState` guard
 * keeps `connect()` from running twice.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-definitely-long-enough-xx';
process.env.RAAST_SECRET_KEY = 'raast-test-secret';

const mongoose = require('mongoose');

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_TEST_URI);
    // The in-memory single-node replica set defaults to a 5ms transaction lock
    // timeout, so back-to-back transactions in a fast test run spuriously fail
    // with TransientTransactionError. Give transactions room to wait for locks
    // (this is a test-env accommodation; it doesn't change production behaviour).
    try {
      await mongoose.connection.db.admin().command({
        setParameter: 1,
        maxTransactionLockRequestTimeoutMillis: 2000,
      });
    } catch {
      // Non-fatal — if the parameter can't be set, tests still run (just tighter).
    }
  }
}, 180000);

beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});
