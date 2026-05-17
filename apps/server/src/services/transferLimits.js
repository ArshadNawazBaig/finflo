const mongoose = require('mongoose');
const TransferLimitTier = require('../models/TransferLimitTier');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const FinancialTransaction = require('../models/FinancialTransaction');

/**
 * Per-tenant 3-tier transfer limits. Tiers are seeded lazily — the first time
 * any limit-enforcement code runs for a tenant, three defaults (basic /
 * standard / premium) are written. Admins can rename + edit limits but the
 * three slots themselves are fixed.
 *
 * Members without an assigned tier fall back to the tenant's `standard` tier.
 */

const CHANNELS = ['internal_transfer', 'external_transfer', 'goal_contribution'];

const CHANNEL_LABELS = {
  internal_transfer: 'Member transfer',
  external_transfer: 'Bank withdrawal',
  goal_contribution: 'Goal contribution',
};

// Sensible PKR defaults. Admins can tweak these immediately after seeding.
const DEFAULT_TIERS = [
  {
    slot: 'basic',
    name: 'Basic',
    description: 'Starting tier for every new member — tight caps while trust is built.',
    perChannelLimits: {
      internal_transfer: { perTransaction: 50_000 },
      external_transfer: { perTransaction: 25_000 },
      goal_contribution: { perTransaction: 50_000 },
    },
    dailyCumulativeCap: 100_000,
    upgradeFee: 0,
  },
  {
    slot: 'standard',
    name: 'Standard',
    description: 'Higher per-transaction and daily ceilings for verified, active members.',
    perChannelLimits: {
      internal_transfer: { perTransaction: 200_000 },
      external_transfer: { perTransaction: 100_000 },
      goal_contribution: { perTransaction: 200_000 },
    },
    dailyCumulativeCap: 500_000,
    upgradeFee: 1_000,
  },
  {
    slot: 'premium',
    name: 'Premium',
    description: 'High-trust members — large per-transaction and daily ceilings.',
    perChannelLimits: {
      internal_transfer: { perTransaction: 1_000_000 },
      external_transfer: { perTransaction: 500_000 },
      goal_contribution: { perTransaction: 1_000_000 },
    },
    dailyCumulativeCap: 2_000_000,
    upgradeFee: 5_000,
  },
];

// Slot ordering — used to validate upgrades (members can move up but not down).
const SLOT_RANK = { basic: 0, standard: 1, premium: 2 };

/**
 * Seed any missing slots for a tenant. Idempotent — safe to call from any
 * code path. Uses unordered bulk upserts so a partial existing set fills in
 * cleanly.
 */
const ensureSeededTiers = async (userId) => {
  if (!userId) return [];
  const existing = await TransferLimitTier.find({ user: userId }).lean();
  const haveSlots = new Set(existing.map((t) => t.slot));
  const missing = DEFAULT_TIERS.filter((t) => !haveSlots.has(t.slot));
  if (missing.length > 0) {
    await TransferLimitTier.insertMany(
      missing.map((t) => ({ ...t, user: userId })),
      { ordered: false },
    );
  }
  return TransferLimitTier.find({ user: userId }).sort({ slot: 1 }).lean();
};

const getStartOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getEndOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * Resolves the effective tier for a member. If the member has an explicit
 * assignment we use it; otherwise we fall back to the tenant's 'basic'
 * tier (seeding it if missing). Basic is the default for any member
 * without an explicit upgrade.
 */
const getEffectiveTier = async (member) => {
  if (!member) return null;
  if (member.transferLimitTier) {
    const explicit = await TransferLimitTier.findById(member.transferLimitTier);
    if (explicit) return explicit;
  }
  await ensureSeededTiers(member.user);
  return TransferLimitTier.findOne({ user: member.user, slot: 'basic' });
};

/**
 * Sum of today's debits across all limited channels for a member. Reads
 * from the Investment ledger so any debit (transfer, withdrawal, goal
 * contribution) is naturally included. Reversed entries are excluded.
 */
const getDailyDebitSum = async (memberId) => {
  const result = await Investment.aggregate([
    {
      $match: {
        member: new mongoose.Types.ObjectId(memberId),
        date: { $gte: getStartOfTodayUTC(), $lte: getEndOfTodayUTC() },
        type: { $in: ['transfer_send', 'withdrawal'] },
        status: { $ne: 'Reversed' },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result?.[0]?.total || 0;
};

/**
 * Throws a structured Error when the proposed debit would breach either the
 * per-channel per-transaction cap or the daily cumulative cap. Callers
 * should pass the raw integer `amount` (PKR) and one of the known channel
 * names — unknown channels are skipped silently (no enforcement).
 */
const assertWithinLimits = async ({ memberId, channel, amount }) => {
  if (!CHANNELS.includes(channel)) return; // no enforcement for unknown channels
  const value = Math.round(Number(amount) || 0);
  if (value <= 0) return;

  const member = await Member.findById(memberId).select(
    'user transferLimitTier',
  );
  if (!member) {
    throw Object.assign(new Error('Member not found'), { status: 404 });
  }

  const tier = await getEffectiveTier(member);
  if (!tier) return; // no tier configured — fail open rather than locking everyone out

  // Per-transaction cap (0 = unlimited).
  const channelCap = tier.perChannelLimits?.[channel]?.perTransaction || 0;
  if (channelCap > 0 && value > channelCap) {
    const err = new Error(
      `Per-transaction limit exceeded for ${CHANNEL_LABELS[channel]}. Max: Rs. ${channelCap.toLocaleString()}.`,
    );
    err.status = 403;
    err.code = 'LIMIT_EXCEEDED';
    err.details = {
      reason: 'per_transaction',
      channel,
      attempted: value,
      max: channelCap,
      tierName: tier.name,
    };
    throw err;
  }

  // Daily cumulative cap (0 = unlimited).
  const dailyCap = tier.dailyCumulativeCap || 0;
  if (dailyCap > 0) {
    const usedToday = await getDailyDebitSum(memberId);
    const remaining = Math.max(0, dailyCap - usedToday);
    if (value > remaining) {
      const err = new Error(
        `Daily cap exceeded. Used Rs. ${usedToday.toLocaleString()} of Rs. ${dailyCap.toLocaleString()}; remaining Rs. ${remaining.toLocaleString()}.`,
      );
      err.status = 403;
      err.code = 'LIMIT_EXCEEDED';
      err.details = {
        reason: 'daily_cumulative',
        attempted: value,
        usedToday,
        remaining,
        cap: dailyCap,
        tierName: tier.name,
      };
      throw err;
    }
  }
};

/**
 * Surface limits + today's usage to the member UI so they can see the cap
 * before they hit it.
 */
const getMemberLimitsSummary = async (memberId) => {
  const member = await Member.findById(memberId).select(
    'user transferLimitTier',
  );
  if (!member) return null;
  const tier = await getEffectiveTier(member);
  if (!tier) return null;
  const usedToday = await getDailyDebitSum(memberId);
  const dailyCap = tier.dailyCumulativeCap || 0;
  return {
    tier: {
      id: tier._id,
      slot: tier.slot,
      name: tier.name,
      description: tier.description,
    },
    perChannel: CHANNELS.reduce((acc, ch) => {
      acc[ch] = {
        label: CHANNEL_LABELS[ch],
        perTransaction: tier.perChannelLimits?.[ch]?.perTransaction || 0,
      };
      return acc;
    }, {}),
    daily: {
      cap: dailyCap,
      used: usedToday,
      remaining: dailyCap > 0 ? Math.max(0, dailyCap - usedToday) : null,
    },
  };
};

/**
 * Member-initiated tier upgrade. Validates the destination is strictly
 * higher than the current slot, debits the upgrade fee from currentBalance,
 * logs an Investment entry, and assigns the new tier — all atomically.
 *
 * Throws structured errors so the route handler can map them to clean HTTP
 * responses.
 */
const upgradeMemberTier = async ({ memberId, targetTierId }) => {
  const mongooseLocal = require('mongoose');
  const session = await mongooseLocal.startSession();
  session.startTransaction();
  try {
    const member = await Member.findById(memberId).session(session);
    if (!member) {
      const e = new Error('Member not found.');
      e.status = 404;
      throw e;
    }

    const target = await TransferLimitTier.findOne({
      _id: targetTierId,
      user: member.user,
    }).session(session);
    if (!target) {
      const e = new Error('Invalid tier.');
      e.status = 400;
      throw e;
    }

    // Determine current slot — fall back to 'basic' for unassigned members
    // so a brand-new member can still upgrade from their effective default.
    let currentSlot = 'basic';
    if (member.transferLimitTier) {
      const current = await TransferLimitTier.findById(
        member.transferLimitTier,
      ).session(session);
      if (current) currentSlot = current.slot;
    }

    if (target.slot === currentSlot) {
      const e = new Error('You are already on this tier.');
      e.status = 400;
      e.code = 'ALREADY_ON_TIER';
      throw e;
    }
    if (SLOT_RANK[target.slot] < SLOT_RANK[currentSlot]) {
      const e = new Error(
        'Tier downgrades aren’t self-service. Contact an admin.',
      );
      e.status = 400;
      e.code = 'DOWNGRADE_NOT_ALLOWED';
      throw e;
    }

    const fee = Math.max(0, Math.round(target.upgradeFee || 0));

    if (fee > 0) {
      const debited = await Member.updateOne(
        { _id: memberId, currentBalance: { $gte: fee } },
        {
          $inc: { currentBalance: -fee, totalWithdrawn: fee },
        },
        { session },
      );
      if (debited.modifiedCount !== 1) {
        const e = new Error(
          `Insufficient current balance for the Rs. ${fee.toLocaleString()} upgrade fee.`,
        );
        e.status = 402;
        e.code = 'INSUFFICIENT_BALANCE';
        throw e;
      }

      const refreshed = await Member.findById(memberId).session(session);

      // (1) Member-side ledger entry — the debit shows up on the member's
      // statements as a withdrawal.
      await Investment.create(
        [
          {
            user: refreshed.user,
            member: refreshed._id,
            branchId: refreshed.branchId,
            type: 'withdrawal',
            accountType: 'current',
            amount: fee,
            balanceAfter: refreshed.currentBalance,
            description: `Tier upgrade fee → ${target.name}`,
            date: new Date(),
            metadata: {
              category: 'tier_upgrade_fee',
              fromSlot: currentSlot,
              toSlot: target.slot,
              tierId: target._id,
            },
          },
        ],
        { session },
      );

      // (2) Business-side ledger entry — credits the fee as income to the
      // tenant owner so it shows up in revenue/fee-income reports alongside
      // checkbook fees and late fees.
      await FinancialTransaction.create(
        [
          {
            user: refreshed.user,
            branchId: refreshed.branchId,
            type: 'income',
            category: 'tier_upgrade_fee',
            amount: fee,
            date: new Date(),
            description: `Tier upgrade fee — ${refreshed.name || refreshed.email} → ${target.name}`,
            member: refreshed._id,
            referenceId: target._id,
            referenceModel: 'TransferLimitTier',
            paymentMethod: 'online',
          },
        ],
        { session },
      );
    }

    await Member.updateOne(
      { _id: memberId },
      { $set: { transferLimitTier: target._id } },
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    return { tier: target, feeCharged: fee, fromSlot: currentSlot };
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) {}
    session.endSession();
    throw err;
  }
};

module.exports = {
  CHANNELS,
  CHANNEL_LABELS,
  DEFAULT_TIERS,
  SLOT_RANK,
  ensureSeededTiers,
  getEffectiveTier,
  getDailyDebitSum,
  assertWithinLimits,
  getMemberLimitsSummary,
  upgradeMemberTier,
};
