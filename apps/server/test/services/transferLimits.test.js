/**
 * transferLimits — lazy tier seeding, per-transaction + daily-cumulative cap
 * enforcement, and member-initiated tier upgrades.
 */
const TransferLimitTier = require('../../src/models/TransferLimitTier');
const Investment = require('../../src/models/Investment');
const {
  ensureSeededTiers,
  getEffectiveTier,
  getDailyDebitSum,
  assertWithinLimits,
  upgradeMemberTier,
} = require('../../src/services/transferLimits');
const { makeOwner, makeMember } = require('../helpers/factories');

describe('ensureSeededTiers / getEffectiveTier', () => {
  it('seeds the three default tiers exactly once (idempotent)', async () => {
    const owner = await makeOwner();
    await ensureSeededTiers(owner._id);
    await ensureSeededTiers(owner._id); // re-run must not duplicate
    expect(await TransferLimitTier.countDocuments({ user: owner._id })).toBe(3);
  });

  it('defaults an unassigned member to the basic tier', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const tier = await getEffectiveTier(member);
    expect(tier.slot).toBe('basic');
  });
});

describe('assertWithinLimits — per-transaction cap', () => {
  it('rejects an external transfer above the basic per-transaction cap (25k)', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await expect(
      assertWithinLimits({ memberId: member._id, channel: 'external_transfer', amount: 30000 }),
    ).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });

  it('allows a transfer within the cap', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await expect(
      assertWithinLimits({ memberId: member._id, channel: 'external_transfer', amount: 20000 }),
    ).resolves.toBeUndefined();
  });

  it('does not enforce unknown channels or non-positive amounts', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await expect(
      assertWithinLimits({ memberId: member._id, channel: 'mystery', amount: 9_999_999 }),
    ).resolves.toBeUndefined();
    await expect(
      assertWithinLimits({ memberId: member._id, channel: 'external_transfer', amount: 0 }),
    ).resolves.toBeUndefined();
  });
});

describe('getDailyDebitSum + daily cumulative cap', () => {
  it('sums today’s withdrawals/transfers and blocks once the daily cap is hit', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    // Basic daily cap is 100k. Spend 90k today already.
    await Investment.create({
      user: owner._id, member: member._id, type: 'withdrawal', amount: 90000, date: new Date(),
    });

    expect(await getDailyDebitSum(member._id)).toBe(90000);

    // A further 20k internal transfer is under the per-tx cap (50k) but busts the daily cap.
    await expect(
      assertWithinLimits({ memberId: member._id, channel: 'internal_transfer', amount: 20000 }),
    ).rejects.toMatchObject({ details: { reason: 'daily_cumulative' } });
  });

  it('excludes reversed entries from the daily sum', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await Investment.create({
      user: owner._id, member: member._id, type: 'withdrawal', amount: 5000, date: new Date(), status: 'Reversed',
    });
    expect(await getDailyDebitSum(member._id)).toBe(0);
  });
});

describe('upgradeMemberTier', () => {
  it('charges the upgrade fee, assigns the new tier and writes both ledgers', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 5000 });
    await ensureSeededTiers(owner._id);
    const standard = await TransferLimitTier.findOne({ user: owner._id, slot: 'standard' });

    const result = await upgradeMemberTier({ memberId: member._id, targetTierId: standard._id });

    expect(result.feeCharged).toBe(standard.upgradeFee);
    const fresh = await (require('../../src/models/Member')).findById(member._id);
    expect(String(fresh.transferLimitTier)).toBe(String(standard._id));
    expect(fresh.currentBalance).toBe(5000 - standard.upgradeFee);
  });

  it('blocks an upgrade when the wallet cannot cover the fee', async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner, { currentBalance: 0 });
    await ensureSeededTiers(owner._id);
    const premium = await TransferLimitTier.findOne({ user: owner._id, slot: 'premium' });

    await expect(
      upgradeMemberTier({ memberId: member._id, targetTierId: premium._id }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
  });

  it('refuses a self-service downgrade', async () => {
    const owner = await makeOwner();
    await ensureSeededTiers(owner._id);
    const premium = await TransferLimitTier.findOne({ user: owner._id, slot: 'premium' });
    const basic = await TransferLimitTier.findOne({ user: owner._id, slot: 'basic' });
    const member = await makeMember(owner, { currentBalance: 100000, transferLimitTier: premium._id });

    await expect(
      upgradeMemberTier({ memberId: member._id, targetTierId: basic._id }),
    ).rejects.toMatchObject({ code: 'DOWNGRADE_NOT_ALLOWED' });
  });
});
