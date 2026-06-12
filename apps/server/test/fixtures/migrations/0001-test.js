// Fixture migration used only by migrationRunner.test.js. Writes a marker doc so
// the test can assert it ran exactly once across repeated runs.
module.exports = {
  name: 'test-0001',
  up: async ({ mongoose }) => {
    await mongoose.connection
      .collection('migration_test_marker')
      .insertOne({ at: new Date() });
  },
};
