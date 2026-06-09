/**
 * Re-fix loan ledger using corrected filter (exclude Reversed, not require Completed)
 * Run: node apps/server/src/scripts/refixLoans.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');

async function run() {
  console.log('🔗 Connecting...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  // Exclude rejected (never funded) and renewed (debt moved into a successor
  // loan; remainingAmount is intentionally 0 and must not be recomputed).
  const loans = await Loan.find({ status: { $nin: ['rejected', 'renewed'] } });

  // Use corrected filter: include all non-Reversed repayments
  const repaymentAgg = await Repayment.aggregate([
    { $match: { status: { $ne: 'Reversed' } } },
    { $group: { _id: '$loan', totalRepaid: { $sum: '$amount' } } },
  ]);
  const repaymentMap = {};
  repaymentAgg.forEach((r) => (repaymentMap[r._id.toString()] = r.totalRepaid));

  let fixed = 0;
  for (const loan of loans) {
    const loanId = loan._id.toString();
    const actualRepaid = repaymentMap[loanId] || 0;
    let changed = false;

    if (Math.abs(actualRepaid - (loan.paidAmount || 0)) > 1) {
      console.log(`  🔧 Loan ${loanId.slice(-6)}: paidAmount ${loan.paidAmount} → ${Math.round(actualRepaid)}`);
      loan.paidAmount = Math.round(actualRepaid);
      changed = true;
    }

    const correctRemaining = Math.max(0, (loan.totalAmount || 0) - loan.paidAmount);
    if (Math.abs(correctRemaining - (loan.remainingAmount || 0)) > 1) {
      console.log(`  🔧 Loan ${loanId.slice(-6)}: remainingAmount ${loan.remainingAmount} → ${Math.round(correctRemaining)}`);
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
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} / ${loans.length} loans`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
