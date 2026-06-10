// Vitest config for the server. Tests run against an in-memory MongoDB REPLICA
// SET (mongodb-memory-server) so the production code's transactions / sessions
// execute for real.
//
// Lifecycle:
//   • globalSetup.js  — starts ONE replica set for the whole run (URI → env)
//   • setup.js        — connects mongoose once + wipes collections before each test
// Single-process, no file parallelism — every test file shares the one replica
// set and the one mongoose connection. Tests are organised into folders under
// test/ (utils, services, models, controllers) and discovered recursively.
module.exports = {
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    globalSetup: ['./test/globalSetup.js'],
    setupFiles: ['./test/setup.js'],
    testTimeout: 60000,
    hookTimeout: 180000,
    fileParallelism: false,
    isolate: false,
  },
};
