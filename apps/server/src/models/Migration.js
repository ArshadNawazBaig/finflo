const mongoose = require('mongoose');

// Applied-migrations ledger. Each record marks one migration file as already
// run, so the runner skips it on subsequent invocations — making `npm run
// migrate` idempotent and migrations versioned/ordered instead of the ad-hoc
// one-off repair scripts this replaces (fix-precision, backfill*, fix*).
const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Migration || mongoose.model('Migration', migrationSchema);
