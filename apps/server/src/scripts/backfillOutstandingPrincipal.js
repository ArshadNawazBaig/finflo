/**
 * One-off migration: backfill Loan.outstandingPrincipal for loans created before
 * the field existed.
 *
 *   node apps/server/src/scripts/backfillOutstandingPrincipal.js
 *
 * outstandingPrincipal = max(0, principal − Σ(Repayment.principalAmount)) for
 * active/overdue loans; 0 for completed/closed loans. Idempotent: re-running only
 * touches loans where the field is still missing/null, so it is safe to run twice.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Backfilling outstandingPrincipal...');

  const cursor = Loan.find({
    $or: [{ outstandingPrincipal: { $exists: false } }, { outstandingPrincipal: null }],
  }).cursor();

  let updated = 0;
  for (let loan = await cursor.next(); loan != null; loan = await cursor.next()) {
    let outstanding;
    if (['completed', 'closed', 'rejected', 'renewed'].includes(loan.status)) {
      outstanding = 0;
    } else {
      const agg = await Repayment.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, principal: { $sum: '$principalAmount' } } },
      ]);
      const principalPaid = agg.length ? agg[0].principal : 0;
      outstanding = Math.max(0, Math.round((loan.principal || 0) - principalPaid));
    }
    await Loan.updateOne({ _id: loan._id }, { $set: { outstandingPrincipal: outstanding } });
    updated += 1;
    if (updated % 500 === 0) console.log(`  ...${updated} loans updated`);
  }

  console.log(`Done. Backfilled ${updated} loan(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
