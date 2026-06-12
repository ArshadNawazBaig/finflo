const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { runMigrations } = require('../services/migrationRunner');

// CLI entry: connect, run pending migrations, disconnect. Wire this into the
// deploy pipeline as a gated step (run BEFORE the new server boots) so schema/
// data changes ship in lock-step with code. Safe to run repeatedly — already
// applied migrations are skipped.
(async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set — cannot run migrations.');
    }
    await mongoose.connect(process.env.MONGO_URI);
    const ran = await runMigrations();
    console.log(
      ran.length
        ? `Applied ${ran.length} migration(s): ${ran.join(', ')}`
        : 'No pending migrations.',
    );
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
