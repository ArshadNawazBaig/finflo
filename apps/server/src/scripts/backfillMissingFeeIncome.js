/**
 * CLI wrapper around the shared `feeBackfillService`. The same logic is also
 * exposed via `POST /api/ledger/sync-fee-income` for in-app triggering when
 * a script can't easily run (DNS issues, sandboxed environment, etc.).
 *
 * Idempotent across all three classes. See feeBackfillService.js for
 * details.
 *
 * Usage:
 *   node src/scripts/backfillMissingFeeIncome.js                # apply all
 *   node src/scripts/backfillMissingFeeIncome.js --dry-run      # preview
 *   node src/scripts/backfillMissingFeeIncome.js --only=tier    # tier only
 *   node src/scripts/backfillMissingFeeIncome.js --only=late    # late only
 *   node src/scripts/backfillMissingFeeIncome.js --only=td      # TD only
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { runFeeBackfill } = require('../services/feeBackfillService');

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '')
  .split('=')[1]
  ?.toLowerCase();

const run = async () => {
  const t0 = Date.now();
  try {
    await connectDB();
    console.log(
      `\n${DRY_RUN ? '[DRY RUN] ' : ''}Backfilling missing fee income…${
        ONLY ? ` (only=${ONLY})` : ''
      }\n`,
    );

    if (DRY_RUN) {
      // For dry-run we re-implement counting here to avoid the service
      // actually writing. Cheap and explicit.
      const Investment = require('../models/Investment');
      const Loan = require('../models/Loan');
      const TermDeposit = require('../models/TermDeposit');
      const FinancialTransaction = require('../models/FinancialTransaction');

      let tier = 0,
        late = 0,
        td = 0;

      if (!ONLY || ONLY === 'tier') {
        const orphans = await Investment.find({
          'metadata.category': 'tier_upgrade_fee',
          type: 'withdrawal',
        }).lean();
        for (const inv of orphans) {
          const tierId = inv.metadata?.tierId;
          if (!tierId) continue;
          const exists = await FinancialTransaction.exists({
            category: 'tier_upgrade_fee',
            member: inv.member,
            referenceId: tierId,
            amount: inv.amount,
          });
          if (!exists) tier += 1;
        }
        console.log(`1) Tier upgrade fees — would create ${tier}`);
      }
      if (!ONLY || ONLY === 'late') {
        const loans = await Loan.find({ lateFeeAmount: { $gt: 0 } }).select(
          '_id lateFeeAmount',
        );
        for (const loan of loans) {
          const r = await FinancialTransaction.aggregate([
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
          if (loan.lateFeeAmount - (r?.[0]?.total || 0) > 0) late += 1;
        }
        console.log(`2) Late fee accruals — would create ${late}`);
      }
      if (!ONLY || ONLY === 'td') {
        const broken = await TermDeposit.find({ status: 'broken' });
        for (const t of broken) {
          const exists = await FinancialTransaction.exists({
            category: 'term_deposit_break_fee',
            referenceId: t._id,
          });
          if (!exists) td += 1;
        }
        console.log(`3) TD early-break penalties — would create ${td}`);
      }
      console.log(`\nTotal previewed: ${tier + late + td}`);
    } else {
      const result = await runFeeBackfill({ scope: ONLY });
      console.log(
        `1) Tier upgrade fees — created ${result.tier.created} (scanned ${result.tier.scanned})`,
      );
      console.log(
        `2) Late fee accruals — created ${result.late.created} (scanned ${result.late.scanned} loans)`,
      );
      console.log(
        `3) TD early-break penalties — created ${result.td.created} (scanned ${result.td.scanned} deposits)`,
      );
      console.log(`\nTotal created: ${result.totalCreated}`);
    }

    console.log(`Elapsed: ${(Date.now() - t0) / 1000}s\n`);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
