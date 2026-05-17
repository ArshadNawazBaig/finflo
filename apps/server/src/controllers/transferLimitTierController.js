const TransferLimitTier = require('../models/TransferLimitTier');
const Member = require('../models/Member');
const {
  ensureSeededTiers,
  CHANNELS,
  getMemberLimitsSummary,
  upgradeMemberTier,
} = require('../services/transferLimits');
const { logActivity } = require('./activityLogController');
const { createTransactionNotification } = require('../utils/notificationHelper');

/**
 * @desc    List the 3 transfer-limit tiers for the calling admin's tenant.
 *          Seeds defaults the first time it's called.
 * @route   GET /api/transfer-limit-tiers
 * @access  Admin
 */
const listTiers = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const tiers = await ensureSeededTiers(userId);
    res.json(tiers);
  } catch (error) {
    console.error('listTiers Error:', error);
    res.status(500).json({ message: 'Failed to load tiers.' });
  }
};

/**
 * @desc    Update a single tier's name/description/limits. Slot is immutable.
 * @route   PUT /api/transfer-limit-tiers/:id
 * @access  Admin
 */
const updateTier = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      name,
      description,
      perChannelLimits,
      dailyCumulativeCap,
      upgradeFee,
    } = req.body;

    const tier = await TransferLimitTier.findOne({
      _id: req.params.id,
      user: userId,
    });
    if (!tier) {
      return res.status(404).json({ message: 'Tier not found.' });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
      }
      tier.name = trimmed;
    }
    if (description !== undefined) tier.description = String(description).trim();
    if (
      dailyCumulativeCap !== undefined &&
      Number(dailyCumulativeCap) >= 0
    ) {
      tier.dailyCumulativeCap = Math.round(Number(dailyCumulativeCap));
    }
    if (upgradeFee !== undefined && Number(upgradeFee) >= 0) {
      tier.upgradeFee = Math.round(Number(upgradeFee));
    }
    if (perChannelLimits && typeof perChannelLimits === 'object') {
      for (const ch of CHANNELS) {
        if (
          perChannelLimits[ch] &&
          typeof perChannelLimits[ch] === 'object' &&
          perChannelLimits[ch].perTransaction !== undefined
        ) {
          const v = Math.max(0, Math.round(Number(perChannelLimits[ch].perTransaction) || 0));
          tier.perChannelLimits[ch] = { perTransaction: v };
        }
      }
      tier.markModified('perChannelLimits');
    }

    await tier.save();

    try {
      await logActivity({
        userId: req.user._id,
        action: 'transfer_limit_tier_updated',
        category: 'admin',
        details: `Updated transfer-limit tier: ${tier.name} (slot ${tier.slot})`,
        metadata: { tierId: tier._id, slot: tier.slot },
        req,
      });
    } catch (e) {
      /* non-critical */
    }

    res.json(tier);
  } catch (error) {
    console.error('updateTier Error:', error);
    res.status(500).json({ message: 'Failed to update tier.' });
  }
};

/**
 * @desc    Assign a member to a tier (or clear back to default).
 * @route   PUT /api/transfer-limit-tiers/assign/:memberId
 * @access  Admin
 */
const assignMemberTier = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { tierId } = req.body; // null/undefined → fall back to standard
    const member = await Member.findOne({
      _id: req.params.memberId,
      user: userId,
    });
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    if (tierId) {
      const tier = await TransferLimitTier.findOne({
        _id: tierId,
        user: userId,
      });
      if (!tier) {
        return res
          .status(400)
          .json({ message: 'Invalid tier for this tenant.' });
      }
      member.transferLimitTier = tier._id;
    } else {
      member.transferLimitTier = null;
    }

    await member.save();

    try {
      await logActivity({
        userId: req.user._id,
        action: 'member_transfer_tier_assigned',
        category: 'admin',
        details: `Assigned ${member.name || member.email} to tier ${tierId || 'default'}`,
        metadata: { memberId: member._id, tierId: tierId || null },
        req,
      });
    } catch (e) {
      /* non-critical */
    }

    res.json({
      memberId: member._id,
      transferLimitTier: member.transferLimitTier,
    });
  } catch (error) {
    console.error('assignMemberTier Error:', error);
    res.status(500).json({ message: 'Failed to assign tier.' });
  }
};

/**
 * @desc    Member-facing: own limits summary + today's usage.
 * @route   GET /api/transfer-limit-tiers/portal/my-limits
 * @access  Member
 */
const getPortalLimits = async (req, res) => {
  try {
    const summary = await getMemberLimitsSummary(req.member._id);
    res.json(summary || {});
  } catch (error) {
    console.error('getPortalLimits Error:', error);
    res.status(500).json({ message: 'Failed to load limits.' });
  }
};

/**
 * @desc    Member-facing: list available tiers for the member's tenant so
 *          the upgrade UI can render the catalog with fees.
 * @route   GET /api/transfer-limit-tiers/portal/available
 * @access  Member
 */
const getPortalTierCatalog = async (req, res) => {
  try {
    const tiers = await ensureSeededTiers(req.member.user);
    res.json(tiers);
  } catch (error) {
    console.error('getPortalTierCatalog Error:', error);
    res.status(500).json({ message: 'Failed to load tiers.' });
  }
};

/**
 * @desc    Member-initiated upgrade. Debits the upgrade fee from current
 *          balance and assigns the new tier atomically.
 * @route   POST /api/transfer-limit-tiers/portal/upgrade
 * @access  Member
 */
const upgradePortalTier = async (req, res) => {
  const { tierId } = req.body;
  if (!tierId) {
    return res.status(400).json({ message: 'tierId is required.' });
  }
  try {
    const result = await upgradeMemberTier({
      memberId: req.member._id,
      targetTierId: tierId,
    });

    try {
      await logActivity({
        userId: req.member._id,
        action: 'transfer_tier_upgraded',
        category: 'member',
        details: `Upgraded from ${result.fromSlot} → ${result.tier.slot} (fee Rs. ${result.feeCharged})`,
        metadata: {
          fromSlot: result.fromSlot,
          toSlot: result.tier.slot,
          fee: result.feeCharged,
          isMemberAction: true,
        },
        req,
      });
    } catch (e) {
      /* non-critical */
    }

    try {
      await createTransactionNotification({
        recipientId: req.member._id,
        title: 'Tier upgraded',
        message:
          result.feeCharged > 0
            ? `You are now on the ${result.tier.name} tier. Rs. ${result.feeCharged.toLocaleString()} upgrade fee deducted.`
            : `You are now on the ${result.tier.name} tier.`,
        type: 'success',
        branchId: req.member.branchId,
        action: 'transfer_tier_upgraded',
        metadata: { tierId: result.tier._id, fee: result.feeCharged },
      });
    } catch (e) {
      /* non-critical */
    }

    res.json({
      tier: result.tier,
      feeCharged: result.feeCharged,
      fromSlot: result.fromSlot,
    });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ message: error.message, code: error.code });
    }
    console.error('upgradePortalTier Error:', error);
    res.status(500).json({ message: 'Failed to upgrade tier.' });
  }
};

module.exports = {
  listTiers,
  updateTier,
  assignMemberTier,
  getPortalLimits,
  getPortalTierCatalog,
  upgradePortalTier,
};
