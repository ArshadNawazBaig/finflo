/**
 * One-off migration for the loan-proceeds reclassification (B5 disbursement half).
 *
 *   node apps/server/src/scripts/backfillLoanProceeds.js
 *
 * Historically, loan disbursements were recorded as Investment(type:'deposit') and
 * counted in Member.totalInvested — inflating the "member capital / deposits" base.
 * This migration:
 *   1. Re-types those Investment rows to 'loan_disbursement' (identified by their
 *      "Loan Disbursement" description).
 *   2. Rebuilds each member's totalInvested / totalLoanProceeds / totalWithdrawn /
 *      totalProfit / currentBalance from the (now correctly-typed) ledger — the
 *      same authoritative rebuild the nightly cron runs.
 *
 * currentBalance is unchanged (proceeds still back the wallet); only the split
 * between totalInvested and totalLoanProceeds moves. Idempotent and safe to re-run.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const ProfitDistribution = require('../models/ProfitDistribution');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  // 1. Re-type historical disbursement deposits.
  const retype = await Investment.updateMany(
    { type: 'deposit', description: { $regex: /^Loan Disbursement/i } },
    { $set: { type: 'loan_disbursement' } },
  );
  console.log(`Re-typed ${retype.modifiedCount} disbursement Investment(s).`);

  // 2. Rebuild current-account aggregates from the ledger.
  const invAgg = await Investment.aggregate([
    { $match: { accountType: 'current', status: { $ne: 'Reversed' } } },
    {
      $group: {
        _id: '$member',
        totalInvested: {
          $sum: { $cond: [{ $in: ['$type', ['deposit', 'transfer_receive']] }, '$amount', 0] },
        },
        totalWithdrawn: {
          $sum: { $cond: [{ $in: ['$type', ['withdrawal', 'transfer_send']] }, '$amount', 0] },
        },
        totalLoanProceeds: {
          $sum: { $cond: [{ $eq: ['$type', 'loan_disbursement'] }, '$amount', 0] },
        },
      },
    },
  ]);
  const profitAgg = await ProfitDistribution.aggregate([
    { $match: { type: 'regular', status: { $ne: 'Failed' } } },
    { $group: { _id: '$member', totalProfit: { $sum: '$amount' } } },
  ]);

  const ledger = new Map();
  for (const r of invAgg) {
    ledger.set(r._id.toString(), {
      totalInvested: r.totalInvested,
      totalWithdrawn: r.totalWithdrawn,
      totalLoanProceeds: r.totalLoanProceeds,
      totalProfit: 0,
    });
  }
  for (const r of profitAgg) {
    const k = r._id.toString();
    const e = ledger.get(k) || { totalInvested: 0, totalWithdrawn: 0, totalLoanProceeds: 0, totalProfit: 0 };
    e.totalProfit = r.totalProfit;
    ledger.set(k, e);
  }

  let updated = 0;
  let ops = [];
  const cursor = Member.find({}).select('_id').cursor();
  for (let m = await cursor.next(); m != null; m = await cursor.next()) {
    const e = ledger.get(m._id.toString()) || {
      totalInvested: 0,
      totalWithdrawn: 0,
      totalLoanProceeds: 0,
      totalProfit: 0,
    };
    ops.push({
      updateOne: {
        filter: { _id: m._id },
        update: {
          $set: {
            totalInvested: Math.round(e.totalInvested),
            totalLoanProceeds: Math.round(e.totalLoanProceeds),
            totalWithdrawn: Math.round(e.totalWithdrawn),
            totalProfit: Math.round(e.totalProfit),
            currentBalance: Math.round(
              e.totalInvested + e.totalLoanProceeds - e.totalWithdrawn + e.totalProfit,
            ),
          },
        },
      },
    });
    if (ops.length >= 500) {
      await Member.bulkWrite(ops, { ordered: false });
      updated += ops.length;
      ops = [];
    }
  }
  if (ops.length) {
    await Member.bulkWrite(ops, { ordered: false });
    updated += ops.length;
  }

  console.log(`Rebuilt aggregates for ${updated} member(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
