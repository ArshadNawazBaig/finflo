/**
 * One-time script to fix Transaction Integrity orphans
 * These are FinancialTransactions linked to Repayment/Investment records
 * that no longer exist or have been reversed.
 * 
 * Run: node apps/server/src/scripts/fixOrphanTransactions.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const FinancialTransaction = require('../models/FinancialTransaction');
const Repayment = require('../models/Repayment');
const Investment = require('../models/Investment');
const Loan = require('../models/Loan');
const BusinessShare = require('../models/BusinessShare');
const TermDeposit = require('../models/TermDeposit');
const ProfitDistribution = require('../models/ProfitDistribution');
const Checkbook = require('../models/Checkbook');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // Find all linked, non-reversed transactions
  const linkedTxns = await FinancialTransaction.find({
    referenceId: { $exists: true, $ne: null },
    status: { $ne: 'Reversed' },
  }).select('referenceId referenceModel amount type category date description');

  console.log(`📋 Total linked transactions: ${linkedTxns.length}\n`);

  // Group by referenceModel
  const grouped = {};
  linkedTxns.forEach((txn) => {
    const model = txn.referenceModel || 'Unknown';
    if (!grouped[model]) grouped[model] = [];
    grouped[model].push(txn);
  });

  let totalOrphansFixed = 0;

  // ── Fix Repayment Orphans ──
  if (grouped.Repayment?.length) {
    console.log(`━━━ Repayment References (${grouped.Repayment.length}) ━━━`);
    const repaymentIds = grouped.Repayment.map((t) => t.referenceId);
    
    // Find which repayments actually exist and are completed
    const existingRepayments = await Repayment.find({
      _id: { $in: repaymentIds },
      status: 'Completed',
    }).select('_id');
    const existingSet = new Set(existingRepayments.map((r) => r._id.toString()));

    let orphanCount = 0;
    for (const txn of grouped.Repayment) {
      const refId = txn.referenceId?.toString();
      if (!existingSet.has(refId)) {
        // This is an orphan — mark the transaction as Reversed
        await FinancialTransaction.findByIdAndUpdate(txn._id, {
          status: 'Reversed',
          reversalReason: 'Auto-reconciliation: source Repayment record not found or reversed',
          reversedAt: new Date(),
        });
        orphanCount++;
        console.log(`  🔧 Reversed orphan tx ${txn._id.toString().slice(-6)} (${txn.category}, amount: ${txn.amount})`);
      }
    }
    console.log(`  ✅ Fixed ${orphanCount} / ${grouped.Repayment.length} repayment orphans\n`);
    totalOrphansFixed += orphanCount;
  }

  // ── Fix Investment Orphans ──
  if (grouped.Investment?.length) {
    console.log(`━━━ Investment References (${grouped.Investment.length}) ━━━`);
    const investmentIds = grouped.Investment.map((t) => t.referenceId);

    const existingInvestments = await Investment.find({
      _id: { $in: investmentIds },
      status: { $ne: 'Reversed' },
    }).select('_id');
    const existingSet = new Set(existingInvestments.map((i) => i._id.toString()));

    let orphanCount = 0;
    for (const txn of grouped.Investment) {
      const refId = txn.referenceId?.toString();
      if (!existingSet.has(refId)) {
        await FinancialTransaction.findByIdAndUpdate(txn._id, {
          status: 'Reversed',
          reversalReason: 'Auto-reconciliation: source Investment record not found or reversed',
          reversedAt: new Date(),
        });
        orphanCount++;
        console.log(`  🔧 Reversed orphan tx ${txn._id.toString().slice(-6)} (${txn.category}, amount: ${txn.amount})`);
      }
    }
    console.log(`  ✅ Fixed ${orphanCount} / ${grouped.Investment.length} investment orphans\n`);
    totalOrphansFixed += orphanCount;
  }

  // ── Fix other model orphans (TermDeposit, etc.) ──
  const otherModels = Object.keys(grouped).filter(
    (m) => m !== 'Repayment' && m !== 'Investment' && m !== 'Unknown',
  );
  for (const modelName of otherModels) {
    const txns = grouped[modelName];
    console.log(`━━━ ${modelName} References (${txns.length}) ━━━`);

    try {
      const Model = mongoose.model(modelName);
      const ids = txns.map((t) => t.referenceId);
      const existing = await Model.find({ _id: { $in: ids } }).select('_id');
      const existingSet = new Set(existing.map((e) => e._id.toString()));

      let orphanCount = 0;
      for (const txn of txns) {
        const refId = txn.referenceId?.toString();
        if (!existingSet.has(refId)) {
          await FinancialTransaction.findByIdAndUpdate(txn._id, {
            status: 'Reversed',
            reversalReason: `Auto-reconciliation: source ${modelName} record not found`,
            reversedAt: new Date(),
          });
          orphanCount++;
          console.log(`  🔧 Reversed orphan tx ${txn._id.toString().slice(-6)} (${txn.category}, amount: ${txn.amount})`);
        }
      }
      console.log(`  ✅ Fixed ${orphanCount} / ${txns.length} ${modelName} orphans\n`);
      totalOrphansFixed += orphanCount;
    } catch (err) {
      console.log(`  ⚠️ Model "${modelName}" not registered, skipping\n`);
    }
  }

  // Summary
  console.log('══════════════════════════════════════════');
  console.log(`📊 TOTAL ORPHAN TRANSACTIONS FIXED: ${totalOrphansFixed}`);
  console.log('══════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('\n✅ Done. Database disconnected.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
