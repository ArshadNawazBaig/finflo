/**
 * One-time migration script to fix historical discrepancies
 * Run: node apps/server/src/scripts/fixReconciliation.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // ══════════════════════════════════════════════════════════════════
  // FIX 1: Member Balance — recalculate currentBalance from source fields
  // ══════════════════════════════════════════════════════════════════
  console.log('━━━ FIX 1: Member Balances ━━━');
  const members = await Member.find({});
  let memberFixed = 0;

  for (const member of members) {
    const expected =
      (member.totalInvested || 0) -
      (member.totalWithdrawn || 0) +
      (member.totalProfit || 0);
    const actual = member.currentBalance || 0;

    if (Math.abs(expected - actual) > 1) {
      console.log(
        `  🔧 ${member.name}: currentBalance ${actual} → ${Math.round(expected)} (diff: ${Math.round(expected - actual)})`,
      );
      member.currentBalance = Math.round(expected);
      await member.save();
      memberFixed++;
    }
  }
  console.log(`  ✅ Fixed ${memberFixed} / ${members.length} members\n`);

  // ══════════════════════════════════════════════════════════════════
  // FIX 2: Loan Ledger — sync paidAmount with actual Repayment records
  // ══════════════════════════════════════════════════════════════════
  console.log('━━━ FIX 2: Loan Ledger ━━━');
  const loans = await Loan.find({ status: { $ne: 'rejected' } });

  const repaymentAgg = await Repayment.aggregate([
    { $match: { status: { $ne: 'Reversed' } } },
    { $group: { _id: '$loan', totalRepaid: { $sum: '$amount' } } },
  ]);
  const repaymentMap = {};
  repaymentAgg.forEach((r) => (repaymentMap[r._id.toString()] = r.totalRepaid));

  let loanFixed = 0;
  for (const loan of loans) {
    const loanId = loan._id.toString();
    const actualRepaid = repaymentMap[loanId] || 0;
    let changed = false;

    if (Math.abs(actualRepaid - (loan.paidAmount || 0)) > 1) {
      console.log(
        `  🔧 Loan ${loanId.slice(-6)}: paidAmount ${loan.paidAmount} → ${Math.round(actualRepaid)}`,
      );
      loan.paidAmount = Math.round(actualRepaid);
      changed = true;
    }

    const correctRemaining = Math.max(0, (loan.totalAmount || 0) - loan.paidAmount);
    if (Math.abs(correctRemaining - (loan.remainingAmount || 0)) > 1) {
      console.log(
        `  🔧 Loan ${loanId.slice(-6)}: remainingAmount ${loan.remainingAmount} → ${Math.round(correctRemaining)}`,
      );
      loan.remainingAmount = Math.round(correctRemaining);
      changed = true;
    }

    if (loan.remainingAmount <= 0 && loan.status === 'active') {
      console.log(`  🔧 Loan ${loanId.slice(-6)}: status active → completed`);
      loan.status = 'completed';
      changed = true;
    }

    if (changed) {
      await loan.save();
      loanFixed++;
    }
  }
  console.log(`  ✅ Fixed ${loanFixed} / ${loans.length} loans\n`);

  // ══════════════════════════════════════════════════════════════════
  // FIX 3: Saving & Share Accounts — recalculate from cumulative fields
  // ══════════════════════════════════════════════════════════════════
  console.log('━━━ FIX 3: Saving & Share Accounts ━━━');
  let savingShareFixed = 0;

  for (const member of members) {
    let changed = false;

    // Saving
    const hasSaving = (member.totalSavingDeposited || 0) > 0 || (member.savingBalance || 0) > 0;
    if (hasSaving) {
      const expectedSaving =
        (member.totalSavingDeposited || 0) -
        (member.totalSavingWithdrawn || 0) +
        (member.totalSavingProfit || 0);
      if (Math.abs(expectedSaving - (member.savingBalance || 0)) > 1) {
        console.log(
          `  🔧 ${member.name}: savingBalance ${member.savingBalance} → ${Math.round(expectedSaving)}`,
        );
        member.savingBalance = Math.round(expectedSaving);
        changed = true;
      }
    }

    // Share
    const hasShare = (member.totalShareInvested || 0) > 0 || (member.shareBalance || 0) > 0;
    if (hasShare) {
      const expectedShare = (member.totalShareInvested || 0) + (member.totalShareProfit || 0);
      if (Math.abs(expectedShare - (member.shareBalance || 0)) > 1) {
        console.log(
          `  🔧 ${member.name}: shareBalance ${member.shareBalance} → ${Math.round(expectedShare)}`,
        );
        member.shareBalance = Math.round(expectedShare);
        changed = true;
      }
    }

    if (changed) {
      await member.save();
      savingShareFixed++;
    }
  }
  console.log(`  ✅ Fixed ${savingShareFixed} saving/share accounts\n`);

  // ══════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════
  console.log('══════════════════════════════════════════');
  console.log(`📊 TOTAL FIXES:`);
  console.log(`   Member Balances:  ${memberFixed}`);
  console.log(`   Loan Ledgers:     ${loanFixed}`);
  console.log(`   Saving/Share:     ${savingShareFixed}`);
  console.log('══════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('\n✅ Done. Database disconnected.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
