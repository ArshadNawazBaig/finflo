/**
 * One-off backfill: create missing FinancialTransaction (type='income') rows
 * for fee charges that historically only recorded the member-side debit but
 * never the business-side credit.
 *
 * Three classes are covered:
 *   1. Tier upgrade fees     — Investment.metadata.category='tier_upgrade_fee'
 *                               with no matching FinancialTransaction.
 *   2. Late fee accruals     — Loans with `lateFeeAmount > 0` for which the
 *                               total income recorded on the loan is less than
 *                               the accrued figure. A single catch-up entry
 *                               is written for the shortfall.
 *   3. TD early-break penalty — TermDeposits with status='broken' where the
 *                               retained-profit penalty was never recorded.
 *
 * Idempotent — every class skips items that already have correct
 * FinancialTransaction entries, so re-running the script is safe.
 *
 * Usage:
 *   node src/scripts/backfillMissingFeeIncome.js                # apply
 *   node src/scripts/backfillMissingFeeIncome.js --dry-run      # preview
 *   node src/scripts/backfillMissingFeeIncome.js --only=tier    # tier only
 *   node src/scripts/backfillMissingFeeIncome.js --only=late    # late only
 *   node src/scripts/backfillMissingFeeIncome.js --only=td      # TD only
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Investment = require('../models/Investment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Loan = require('../models/Loan');
const TermDeposit = require('../models/TermDeposit');
const Member = require('../models/Member');

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '')
  .split('=')[1]
  ?.toLowerCase();

// ─── 1. Tier upgrade fees ────────────────────────────────────────────────────
// Find Investments tagged with metadata.category=tier_upgrade_fee that don't
// already have a sibling FinancialTransaction for the same member + tierId.
const backfillTierUpgradeFees = async () => {
  const orphans = await Investment.find({
    'metadata.category': 'tier_upgrade_fee',
    type: 'withdrawal',
  }).lean();

  let created = 0;
  for (const inv of orphans) {
    const tierId = inv.metadata?.tierId;
    if (!tierId) continue;

    const exists = await FinancialTransaction.exists({
      category: 'tier_upgrade_fee',
      member: inv.member,
      referenceId: tierId,
      amount: inv.amount,
    });
    if (exists) continue;

    if (DRY_RUN) {
      created += 1;
      continue;
    }

    await FinancialTransaction.create({
      user: inv.user,
      branchId: inv.branchId,
      type: 'income',
      category: 'tier_upgrade_fee',
      amount: inv.amount,
      date: inv.date || new Date(),
      description: inv.description || 'Tier upgrade fee (backfilled)',
      member: inv.member,
      referenceId: tierId,
      referenceModel: 'TransferLimitTier',
      paymentMethod: 'online',
    });
    created += 1;
  }
  return { scanned: orphans.length, created };
};

// ─── 2. Late fee accruals ────────────────────────────────────────────────────
// For each loan with lateFeeAmount > 0, compare the total income already
// recorded against the accrued field. If we're under-recorded, write one
// catch-up entry for the shortfall and stamp the loan's `lateFeeAppliedAt`
// so the difference is clear in the data.
const backfillLateFeeAccruals = async () => {
  const loans = await Loan.find({ lateFeeAmount: { $gt: 0 } })
    .select('_id user branchId customer lateFeeAmount lateFeeAppliedAt')
    .lean();

  let scanned = 0;
  let created = 0;
  for (const loan of loans) {
    scanned += 1;
    const recorded = await FinancialTransaction.aggregate([
      {
        $match: {
          loan: loan._id,
          category: 'late_fee',
          type: 'income',
          status: { $ne: 'Reversed' },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const recordedTotal = recorded?.[0]?.total || 0;
    const shortfall = loan.lateFeeAmount - recordedTotal;
    if (shortfall <= 0) continue;

    if (DRY_RUN) {
      created += 1;
      console.log(
        `  loan ${loan._id} — would add catch-up Rs. ${shortfall.toLocaleString()} (accrued ${loan.lateFeeAmount}, recorded ${recordedTotal})`,
      );
      continue;
    }

    await FinancialTransaction.create({
      user: loan.user,
      branchId: loan.branchId,
      type: 'income',
      category: 'late_fee',
      amount: shortfall,
      date: loan.lateFeeAppliedAt || new Date(),
      description: `Late fee catch-up for loan #${loan._id.toString().slice(-6).toUpperCase()} (backfilled)`,
      customer: loan.customer,
      loan: loan._id,
      referenceId: loan._id,
      referenceModel: 'Loan',
      paymentMethod: 'online',
    });
    created += 1;
  }
  return { scanned, created };
};

// ─── 3. TD early-break penalties ─────────────────────────────────────────────
// For each TermDeposit with status='broken', re-derive the penalty (= what
// would have been the full profit at that point minus actualProfit) and
// write the matching FinancialTransaction if missing.
const backfillTermDepositBreakPenalties = async () => {
  const broken = await TermDeposit.find({ status: 'broken' }).lean();
  let scanned = 0;
  let created = 0;

  for (const td of broken) {
    scanned += 1;
    // Months between start and break — same shape as breakTermDeposit().
    const start = new Date(td.startDate);
    const brokenAt = new Date(td.brokenAt || td.updatedAt || Date.now());
    const monthsElapsed = Math.max(
      0,
      Math.min(
        td.duration || 0,
        Math.floor(
          (brokenAt.getFullYear() - start.getFullYear()) * 12 +
            (brokenAt.getMonth() - start.getMonth()),
        ),
      ),
    );
    const fullProfit = Math.max(
      0,
      Math.round((td.principal * td.profitRate * monthsElapsed) / (12 * 100)),
    );
    const actualProfit = Math.max(0, Math.round(td.actualProfit || 0));
    const penalty = Math.max(0, fullProfit - actualProfit);
    if (penalty <= 0) continue;

    const exists = await FinancialTransaction.exists({
      category: 'term_deposit_break_fee',
      referenceId: td._id,
      referenceModel: 'TermDeposit',
    });
    if (exists) continue;

    if (DRY_RUN) {
      created += 1;
      console.log(
        `  td ${td.depositNumber || td._id} — would add penalty Rs. ${penalty.toLocaleString()}`,
      );
      continue;
    }

    await FinancialTransaction.create({
      user: td.user,
      branchId: td.branchId,
      type: 'income',
      category: 'term_deposit_break_fee',
      amount: penalty,
      date: brokenAt,
      description: `TD ${td.depositNumber || td._id.toString().slice(-6)} early-break penalty (backfilled)`,
      member: td.member,
      referenceId: td._id,
      referenceModel: 'TermDeposit',
      paymentMethod: 'online',
    });
    created += 1;
  }
  return { scanned, created };
};

// ─── Runner ──────────────────────────────────────────────────────────────────
const run = async () => {
  const t0 = Date.now();
  try {
    await connectDB();
    console.log(
      `\n${DRY_RUN ? '[DRY RUN] ' : ''}Backfilling missing fee income entries…${
        ONLY ? ` (only=${ONLY})` : ''
      }\n`,
    );

    let tierResult = { scanned: 0, created: 0 };
    let lateResult = { scanned: 0, created: 0 };
    let tdResult = { scanned: 0, created: 0 };

    if (!ONLY || ONLY === 'tier') {
      console.log('1) Tier upgrade fees…');
      tierResult = await backfillTierUpgradeFees();
      console.log(
        `   scanned ${tierResult.scanned}, ${DRY_RUN ? 'would create' : 'created'} ${tierResult.created}`,
      );
    }
    if (!ONLY || ONLY === 'late') {
      console.log('2) Late fee accruals…');
      lateResult = await backfillLateFeeAccruals();
      console.log(
        `   scanned ${lateResult.scanned} loan(s), ${DRY_RUN ? 'would create' : 'created'} ${lateResult.created} catch-up entr${lateResult.created === 1 ? 'y' : 'ies'}`,
      );
    }
    if (!ONLY || ONLY === 'td') {
      console.log('3) Term deposit early-break penalties…');
      tdResult = await backfillTermDepositBreakPenalties();
      console.log(
        `   scanned ${tdResult.scanned} broken deposit(s), ${DRY_RUN ? 'would create' : 'created'} ${tdResult.created}`,
      );
    }

    console.log('\n──────────────────────────────────────────────');
    console.log(`Total ${DRY_RUN ? 'previewed' : 'created'} : ${tierResult.created + lateResult.created + tdResult.created}`);
    console.log(`Elapsed        : ${(Date.now() - t0) / 1000}s`);
    console.log('──────────────────────────────────────────────\n');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
