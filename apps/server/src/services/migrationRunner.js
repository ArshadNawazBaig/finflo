const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Migration = require('../models/Migration');

/**
 * Run all pending migrations against the CURRENT mongoose connection (the caller
 * is responsible for connecting). Migrations live in `migrations/` as numbered
 * files exporting `{ name?, up }`; they run in filename order, and each is
 * recorded in the Migration collection on success so re-running is a no-op.
 *
 * This is the versioned, idempotent replacement for the loose repair scripts in
 * src/scripts / scripts — those should be ported into this format over time.
 *
 * @param {object} [opts]
 * @param {string} [opts.migrationsDir] override the migrations directory (tests)
 * @param {{log?: Function}} [opts.logger] defaults to console
 * @returns {Promise<string[]>} names of migrations applied this run
 */
const runMigrations = async ({ migrationsDir, logger = console } = {}) => {
  const dir = migrationsDir || path.join(__dirname, '../../migrations');
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .sort();

  const applied = new Set(
    (await Migration.find().select('name').lean()).map((m) => m.name),
  );

  const ran = [];
  for (const file of files) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const migration = require(path.join(dir, file));
    const name = migration.name || file.replace(/\.js$/, '');
    if (applied.has(name)) continue;

    logger.log?.(`Running migration: ${name}`);
    await migration.up({ mongoose, connection: mongoose.connection });
    await Migration.create({ name, appliedAt: new Date() });
    ran.push(name);
  }

  return ran;
};

module.exports = { runMigrations };
