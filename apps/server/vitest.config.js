// Vitest config for the server. Tests run against an in-memory MongoDB REPLICA
// SET (mongodb-memory-server) so the production code's transactions / sessions
// execute for real. Single-process, no file parallelism — the suite shares one
// replica set and one mongoose connection managed in test/financial.test.js.
module.exports = {
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 180000,
    fileParallelism: false,
    isolate: false,
  },
};
