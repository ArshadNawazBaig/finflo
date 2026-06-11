/**
 * Tests for the thin migration runner — the versioned, idempotent replacement
 * for the ad-hoc repair scripts. Verifies a pending migration runs exactly once
 * and a re-run is a no-op (plan P0.5 verification #5).
 */
const path = require('path');
const mongoose = require('mongoose');
const { runMigrations } = require('../../src/services/migrationRunner');
const Migration = require('../../src/models/Migration');

const silent = { log: () => {} };
const fixtureDir = path.join(__dirname, '../fixtures/migrations');
const marker = () =>
  mongoose.connection.collection('migration_test_marker').countDocuments();

describe('runMigrations', () => {
  it('applies a pending migration once and records it', async () => {
    const ran = await runMigrations({ migrationsDir: fixtureDir, logger: silent });
    expect(ran).toEqual(['test-0001']);
    expect(await marker()).toBe(1);
    expect(await Migration.countDocuments({ name: 'test-0001' })).toBe(1);
  });

  it('is idempotent — a second run applies nothing and re-runs no migration', async () => {
    const first = await runMigrations({ migrationsDir: fixtureDir, logger: silent });
    expect(first).toEqual(['test-0001']);

    const second = await runMigrations({ migrationsDir: fixtureDir, logger: silent });
    expect(second).toEqual([]);
    // The migration body did NOT run again — still exactly one marker doc.
    expect(await marker()).toBe(1);
    expect(await Migration.countDocuments()).toBe(1);
  });

  it('returns an empty array when the migrations directory is missing', async () => {
    const ran = await runMigrations({
      migrationsDir: path.join(__dirname, '../fixtures/does-not-exist'),
      logger: silent,
    });
    expect(ran).toEqual([]);
  });
});
