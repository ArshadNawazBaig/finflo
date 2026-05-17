/**
 * One-off backfill: assign every existing member who hasn't been explicitly
 * placed on a tier to their tenant's `basic` (free) Transfer Limit Tier.
 *
 * - Idempotent: only touches members whose `transferLimitTier` is null/undefined.
 *   Re-runs are no-ops once everyone is assigned, and members already on
 *   Standard/Premium (admin-assigned) are never demoted.
 * - Tier-aware: lazy-seeds the 3-tier default set for any tenant that
 *   doesn't have one yet (same helper the API uses), so it works for
 *   businesses that haven't opened the Transfer Limits settings page.
 *
 * Usage:
 *   node src/scripts/assignBasicTierToMembers.js              # apply
 *   node src/scripts/assignBasicTierToMembers.js --dry-run    # preview only
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Member = require('../models/Member');
const TransferLimitTier = require('../models/TransferLimitTier');
const { ensureSeededTiers } = require('../services/transferLimits');

const DRY_RUN = process.argv.includes('--dry-run');

const run = async () => {
  const startedAt = Date.now();
  try {
    await connectDB();
    console.log(
      `\n${DRY_RUN ? '[DRY RUN] ' : ''}Assigning Basic tier to unassigned members…\n`,
    );

    // Find every tenant that owns at least one member without a tier.
    const tenantIds = await Member.distinct('user', {
      $or: [
        { transferLimitTier: null },
        { transferLimitTier: { $exists: false } },
      ],
    });

    if (tenantIds.length === 0) {
      console.log('Nothing to do — every member already has a tier.\n');
      return;
    }

    console.log(
      `Found ${tenantIds.length} tenant(s) with unassigned members.\n`,
    );

    let totalAssigned = 0;
    let totalSkipped = 0;
    const failures = [];

    for (const tenantId of tenantIds) {
      try {
        await ensureSeededTiers(tenantId);

        const basic = await TransferLimitTier.findOne({
          user: tenantId,
          slot: 'basic',
        });
        if (!basic) {
          failures.push({
            tenantId: String(tenantId),
            reason: 'Basic tier missing after seed',
          });
          continue;
        }

        const filter = {
          user: tenantId,
          $or: [
            { transferLimitTier: null },
            { transferLimitTier: { $exists: false } },
          ],
        };

        const count = await Member.countDocuments(filter);
        if (count === 0) {
          totalSkipped += 1;
          continue;
        }

        if (DRY_RUN) {
          console.log(
            `  tenant ${tenantId} — would assign ${count} member(s) → "${basic.name}"`,
          );
          totalAssigned += count;
          continue;
        }

        const result = await Member.updateMany(filter, {
          $set: { transferLimitTier: basic._id },
        });
        console.log(
          `  tenant ${tenantId} — assigned ${result.modifiedCount}/${count} member(s) → "${basic.name}"`,
        );
        totalAssigned += result.modifiedCount;
      } catch (err) {
        failures.push({ tenantId: String(tenantId), reason: err.message });
      }
    }

    console.log('\n──────────────────────────────────────────────');
    console.log(`Tenants processed   : ${tenantIds.length}`);
    console.log(`Members ${DRY_RUN ? 'to assign' : 'assigned   '} : ${totalAssigned}`);
    console.log(`Tenants skipped     : ${totalSkipped}`);
    if (failures.length > 0) {
      console.log(`Failures            : ${failures.length}`);
      failures.forEach((f) =>
        console.log(`  - tenant ${f.tenantId}: ${f.reason}`),
      );
    }
    console.log(`Elapsed             : ${(Date.now() - startedAt) / 1000}s`);
    console.log('──────────────────────────────────────────────\n');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
