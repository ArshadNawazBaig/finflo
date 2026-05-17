/**
 * One-time migration: grandfather pre-existing documents to "Verified".
 *
 * Why: Member.documents was upgraded to include a `status` field whose
 * default is "Pending". Without this migration, every legacy document
 * (which had no status at all) would suddenly appear in the verification
 * queue as Pending, even though admins almost certainly already trusted
 * those files.
 *
 * What it does:
 *   • Walks every Member + Customer document.
 *   • If the doc was uploaded BEFORE the cutoff (defaults to "now" at script
 *     run time) AND its current status is "Pending", flips it to "Verified"
 *     and stamps verifiedAt = its original uploadedAt (so the audit trail
 *     reflects the original date, not the migration date).
 *   • Skips docs already in a non-Pending state (Verified / Rejected /
 *     Expired) — we never overwrite an explicit decision.
 *
 * Run:
 *   node apps/server/src/scripts/grandfatherDocuments.js
 *
 * Optional flag:
 *   --cutoff=2026-05-18           # ISO date; only flip docs uploaded BEFORE this
 *   --dry-run                     # report counts without writing
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Customer = require('../models/Customer');

const MONGO_URI = process.env.MONGO_URI;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const cutoffArg = args.find((a) => a.startsWith('--cutoff='));
const cutoff = cutoffArg
  ? new Date(cutoffArg.split('=')[1])
  : new Date(); // default: now
if (Number.isNaN(cutoff.getTime())) {
  console.error('❌ Invalid --cutoff date');
  process.exit(1);
}

async function migrateCollection(Model, label) {
  console.log(`\n━━━ ${label} ━━━`);
  let scanned = 0;
  let candidates = 0;
  let flipped = 0;

  const cursor = Model.find({ 'documents.0': { $exists: true } }).cursor();
  for await (const doc of cursor) {
    scanned++;
    let dirty = false;
    for (const d of doc.documents) {
      if (d.status !== 'Pending') continue;
      const uploadedAt = d.uploadedAt ? new Date(d.uploadedAt) : null;
      if (!uploadedAt || uploadedAt >= cutoff) continue;
      candidates++;
      if (!dryRun) {
        d.status = 'Verified';
        d.verifiedAt = uploadedAt;
        dirty = true;
      }
    }
    if (dirty) {
      await doc.save();
      flipped++;
    }
  }

  console.log(
    `   Scanned ${scanned} records · ${candidates} legacy Pending document(s) ${
      dryRun ? 'would be flipped' : `flipped to Verified across ${flipped} record(s)`
    }`,
  );
}

async function run() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');
  console.log(
    `   Mode: ${dryRun ? 'DRY RUN (no writes)' : 'WRITE'} · Cutoff: ${cutoff.toISOString()}`,
  );

  await migrateCollection(Member, 'Members');
  await migrateCollection(Customer, 'Customers');

  console.log('\n✅ Migration complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
