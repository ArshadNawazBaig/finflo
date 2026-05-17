const Investment = require('../models/Investment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Loan = require('../models/Loan');
const TermDeposit = require('../models/TermDeposit');

/**
 * Reusable backfill for missing `FinancialTransaction` (type='income')
 * entries. The same logic is exposed by both the CLI script
 * (`scripts/backfillMissingFeeIncome.js`) and the admin endpoint
 * (`POST /api/ledger/sync-fee-income`).
 *
 * Three classes are healed:
 *   1. Tier upgrade fees — Investment.metadata.category='tier_upgrade_fee'
 *   2. Late-fee accruals — Loan.lateFeeAmount > recorded FT total
 *   3. TD early-break penalties — TermDeposit.status='broken' with no FT
 *
 * Each class is idempotent. Pass `{ scope }` to limit to one of
 * 'tier' | 'late' | 'td' | undefined (all).
 *
 * Optional `userId` scopes everything to a single tenant (admin trigger).
 */
const backfillTierUpgradeFees = async ({ userId } = {}) => {
  const baseFilter = {
    'metadata.category': 'tier_upgrade_fee',
    type: 'withdrawal',
  };
  if (userId) baseFilter.user = userId;

  const orphans = await Investment.find(baseFilter).lean();
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

const backfillLateFeeAccruals = async ({ userId } = {}) => {
  const filter = { lateFeeAmount: { $gt: 0 } };
  if (userId) filter.user = userId;

  const loans = await Loan.find(filter)
    .select('_id user branchId customer lateFeeAmount lateFeeAppliedAt')
    .lean();

  let created = 0;
  for (const loan of loans) {
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
  return { scanned: loans.length, created };
};

const backfillTermDepositBreakPenalties = async ({ userId } = {}) => {
  const filter = { status: 'broken' };
  if (userId) filter.user = userId;

  const broken = await TermDeposit.find(filter).lean();
  let created = 0;
  for (const td of broken) {
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
  return { scanned: broken.length, created };
};

const runFeeBackfill = async ({ scope, userId } = {}) => {
  const result = {
    tier: { scanned: 0, created: 0 },
    late: { scanned: 0, created: 0 },
    td: { scanned: 0, created: 0 },
  };
  if (!scope || scope === 'tier') {
    result.tier = await backfillTierUpgradeFees({ userId });
  }
  if (!scope || scope === 'late') {
    result.late = await backfillLateFeeAccruals({ userId });
  }
  if (!scope || scope === 'td') {
    result.td = await backfillTermDepositBreakPenalties({ userId });
  }
  result.totalCreated =
    result.tier.created + result.late.created + result.td.created;
  return result;
};

module.exports = {
  runFeeBackfill,
  backfillTierUpgradeFees,
  backfillLateFeeAccruals,
  backfillTermDepositBreakPenalties,
};
