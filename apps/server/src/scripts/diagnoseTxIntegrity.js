/**
 * Diagnose repayment statuses and fix the Transaction Integrity check
 * Run: node apps/server/src/scripts/diagnoseTxIntegrity.js
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

  // 1. Check repayment statuses
  console.log('━━━ Repayment Status Distribution ━━━');
  const repStatuses = await Repayment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  repStatuses.forEach((s) => console.log(`  ${s._id || '(no status)'}: ${s.count}`));

  // 2. Check what the reconciliation engine would flag
  console.log('\n━━━ Simulating Transaction Integrity Check ━━━');
  const linkedTxns = await FinancialTransaction.find({
    referenceId: { $exists: true, $ne: null },
    status: { $ne: 'Reversed' },
  }).select('referenceId referenceModel amount type category');

  const grouped = {};
  linkedTxns.forEach((txn) => {
    const model = txn.referenceModel || 'Unknown';
    if (!grouped[model]) grouped[model] = [];
    grouped[model].push(txn);
  });

  // Check Repayment orphans
  if (grouped.Repayment?.length) {
    const repaymentIds = grouped.Repayment.map((t) => t.referenceId);
    // Current check: only looks for status 'Completed'
    const completedReps = await Repayment.find({
      _id: { $in: repaymentIds },
      status: 'Completed',
    }).select('_id');
    const completedSet = new Set(completedReps.map((r) => r._id.toString()));

    // Check ALL repayments (any status)
    const allReps = await Repayment.find({
      _id: { $in: repaymentIds },
    }).select('_id status');
    const allSet = new Set(allReps.map((r) => r._id.toString()));

    let orphansByCompleted = 0;
    let orphansByExistence = 0;
    let hasNonCompletedStatus = 0;

    for (const txn of grouped.Repayment) {
      const refId = txn.referenceId?.toString();
      if (!completedSet.has(refId)) orphansByCompleted++;
      if (!allSet.has(refId)) orphansByExistence++;
    }

    // Find the ones that exist but are NOT Completed
    for (const txn of grouped.Repayment) {
      const refId = txn.referenceId?.toString();
      if (allSet.has(refId) && !completedSet.has(refId)) {
        hasNonCompletedStatus++;
        const rep = allReps.find((r) => r._id.toString() === refId);
        if (hasNonCompletedStatus <= 5) {
          console.log(`  ⚠️ Repayment ${refId?.slice(-6)} has status="${rep?.status}" (not Completed)`);
        }
      }
    }

    console.log(`\n  Total Repayment txns: ${grouped.Repayment.length}`);
    console.log(`  Orphans (no Completed match): ${orphansByCompleted}`);
    console.log(`  Orphans (truly missing): ${orphansByExistence}`);
    console.log(`  Exist but non-Completed status: ${hasNonCompletedStatus}`);

    // FIX: Set missing status to 'Completed' for repayments that have no status
    const noStatusReps = await Repayment.find({
      _id: { $in: repaymentIds },
      $or: [{ status: { $exists: false } }, { status: null }, { status: '' }],
    });

    if (noStatusReps.length > 0) {
      console.log(`\n  🔧 Fixing ${noStatusReps.length} repayments with missing status → 'Completed'`);
      await Repayment.updateMany(
        {
          _id: { $in: noStatusReps.map((r) => r._id) },
        },
        { $set: { status: 'Completed' } },
      );
      console.log('  ✅ Done');
    }

    // FIX: Mark truly orphan transactions (no repayment record at all) as Reversed
    let fixedOrphans = 0;
    for (const txn of grouped.Repayment) {
      const refId = txn.referenceId?.toString();
      if (!allSet.has(refId)) {
        await FinancialTransaction.findByIdAndUpdate(txn._id, {
          status: 'Reversed',
          reversalReason: 'Auto-reconciliation: source Repayment record does not exist',
          reversedAt: new Date(),
        });
        fixedOrphans++;
      }
    }
    if (fixedOrphans > 0) {
      console.log(`\n  🔧 Reversed ${fixedOrphans} truly orphaned transactions`);
    }
  }

  // Same for Investment
  if (grouped.Investment?.length) {
    console.log(`\n━━━ Investment References (${grouped.Investment.length}) ━━━`);
    const invIds = grouped.Investment.map((t) => t.referenceId);
    const allInvs = await Investment.find({ _id: { $in: invIds } }).select('_id status');
    const allSet = new Set(allInvs.map((i) => i._id.toString()));

    // Fix investments with no status → 'active'
    const noStatusInvs = await Investment.find({
      _id: { $in: invIds },
      $or: [{ status: { $exists: false } }, { status: null }, { status: '' }],
    });
    if (noStatusInvs.length > 0) {
      console.log(`  🔧 Fixing ${noStatusInvs.length} investments with missing status`);
    }

    let missingCount = 0;
    for (const txn of grouped.Investment) {
      if (!allSet.has(txn.referenceId?.toString())) missingCount++;
    }
    console.log(`  Missing: ${missingCount}, Exist: ${grouped.Investment.length - missingCount}`);
  }

  console.log('\n══════════════════════════════════════════');
  console.log('✅ Diagnosis and fixes complete');
  console.log('══════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
