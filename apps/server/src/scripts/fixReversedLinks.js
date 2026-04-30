/**
 * Fix transactions linked to reversed/missing source records
 * Run: node apps/server/src/scripts/fixReversedLinks.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const FinancialTransaction = require('../models/FinancialTransaction');
const Repayment = require('../models/Repayment');
const Investment = require('../models/Investment');

async function run() {
  console.log('🔗 Connecting...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  // ── Fix txns linked to Reversed repayments ──
  console.log('━━━ Checking Repayment links ━━━');
  const repTxns = await FinancialTransaction.find({
    referenceModel: 'Repayment',
    referenceId: { $exists: true, $ne: null },
    status: { $ne: 'Reversed' },
  }).select('referenceId amount category');

  console.log(`  Found ${repTxns.length} non-reversed txns linked to Repayment`);

  let repFixed = 0;
  for (const txn of repTxns) {
    const rep = await Repayment.findById(txn.referenceId).select('status');
    if (!rep || rep.status === 'Reversed') {
      await FinancialTransaction.findByIdAndUpdate(txn._id, {
        status: 'Reversed',
        reversalReason: `Auto-reconciliation: linked Repayment is ${rep ? 'Reversed' : 'missing'}`,
        reversedAt: new Date(),
      });
      repFixed++;
    }
  }
  console.log(`  ✅ Fixed ${repFixed} transactions\n`);

  // ── Fix txns linked to Reversed investments ──
  console.log('━━━ Checking Investment links ━━━');
  const invTxns = await FinancialTransaction.find({
    referenceModel: 'Investment',
    referenceId: { $exists: true, $ne: null },
    status: { $ne: 'Reversed' },
  }).select('referenceId amount category');

  console.log(`  Found ${invTxns.length} non-reversed txns linked to Investment`);

  let invFixed = 0;
  for (const txn of invTxns) {
    const inv = await Investment.findById(txn.referenceId).select('status');
    if (inv && inv.status === 'Reversed') {
      await FinancialTransaction.findByIdAndUpdate(txn._id, {
        status: 'Reversed',
        reversalReason: 'Auto-reconciliation: linked Investment is Reversed',
        reversedAt: new Date(),
      });
      invFixed++;
    }
  }
  console.log(`  ✅ Fixed ${invFixed} transactions\n`);

  console.log('══════════════════════════════════════════');
  console.log(`📊 TOTAL FIXED: ${repFixed + invFixed}`);
  console.log('══════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('\n✅ Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
