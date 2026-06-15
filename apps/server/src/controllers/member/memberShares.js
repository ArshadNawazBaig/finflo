const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Member = require('../../models/Member');
const Investment = require('../../models/Investment');
const BusinessShare = require('../../models/BusinessShare');
const ProfitDistribution = require('../../models/ProfitDistribution');
const FinancialTransaction = require('../../models/FinancialTransaction');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Repayment = require('../../models/Repayment');
const ActivityLog = require('../../models/ActivityLog');
const loanRepaymentService = require('../../services/loanRepaymentService');
const Loan = require('../../models/Loan');
const Checkbook = require('../../models/Checkbook');
const { canAddMember } = require('../../utils/planLimits');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../../utils/notificationHelper');
const { logActivity } = require('../activityLogController');
const {
  deleteCloudinaryFileByUrl,
  uploadSignature,
} = require('../../utils/cloudinaryHelper');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const raastService = require('../../services/raastService');
const {
  transactionEmail,
  memberApprovalEmail,
} = require('../../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../../utils/balanceUtils');
const Branch = require('../../models/Branch');
const { updateMemberCreditLimit } = require('../../services/creditLimitService');
const { getEmailBranding } = require('../../utils/brandingUtils');
const { escapeRegExp } = require('../../utils/stringUtils');
const { roundMoney } = require('../../utils/money');
const { parseBoolean } = require('../../utils/parseQuery');

const { calculateWeightedAverageBalance } = require('./profitHelpers');

// @desc  Get logged-in member's own business share history
// @route GET /api/members/portal/shares
// @access Private (Member)
const getPortalShares = async (req, res) => {
  try {
    const memberId = req.member._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = { member: memberId };
    if (search) {
      query.description = { $regex: escapeRegExp(String(search)), $options: 'i' };
    }

    const [shares, total] = await Promise.all([
      BusinessShare.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      BusinessShare.countDocuments(query),
    ]);

    res.json({
      shares,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get Portal Shares Error:', error);
    res.status(500).json({ message: 'Failed to fetch share history' });
  }
};

// ─── BUSINESS SHARE FUNCTIONS ─────────────────────────────────────────────────

// @desc  Get member's business share transaction history
// @route GET /api/members/:id/shares
// @access Private (Admin/Staff)
const getMemberShares = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [shares, total] = await Promise.all([
      BusinessShare.find({ member: id, user: userId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      BusinessShare.countDocuments({ member: id, user: userId }),
    ]);

    res.json({
      shares,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get Business Shares Error:', error);
    res.status(500).json({ message: 'Failed to fetch business shares' });
  }
};

// @desc  Add a business share investment (deposit)
//        NOTE: intentionally does NOT trigger auto-loan repayment
// @route POST /api/members/:id/share-invest
// @access Private (Admin/Staff)
const addShareInvestment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const { amount, description, deductFromBalance = false } = req.body;

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: 'Invalid share investment amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId }).session(
      session,
    );
    if (!member) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Member not found' });
    }

    if (deductFromBalance && member.currentBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: 'Insufficient current balance for auto-deduction' });
    }

    // Update member share fields atomically
    const incObj = { shareBalance: amount, totalShareInvested: amount };
    if (deductFromBalance) {
      incObj.currentBalance = -amount;
      incObj.totalWithdrawn = amount;
    }

    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, user: userId },
      { $inc: incObj },
      { new: true, session },
    );

    if (!updatedMember) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Member not found' });
    }

    // Create business share record
    const [shareRecord] = await BusinessShare.create(
      [
        {
          user: userId,
          member: id,
          branchId: member.branchId,
          type: 'share_deposit',
          amount,
          description:
            description ||
            (deductFromBalance
              ? 'Share Investment (Auto-Deducted)'
              : 'Business share investment'),
          shareBalanceAfter: updatedMember.shareBalance,
        },
      ],
      { session },
    );

    // If deducted from balance, log withdrawal from main ledger
    if (deductFromBalance) {
      await Investment.create(
        [
          {
            user: userId,
            member: id,
            branchId: member.branchId,
            type: 'withdrawal',
            amount,
            description: description || 'Share Investment (Auto-Deduction)',
            balanceAfter: updatedMember.currentBalance,
          },
        ],
        { session },
      );
    } else {
      // Financial transaction only for external injections (income)
      await FinancialTransaction.create(
        [
          {
            user: userId,
            branchId: member.branchId,
            type: 'credit',
            category: 'investment',
            amount,
            date: new Date(),
            description: description || 'Business share investment',
            member: member._id,
            referenceId: shareRecord._id,
            referenceModel: 'BusinessShare',
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Notify member (Outside transaction)
    try {
      await createTransactionNotification({
        recipientId: member._id,
        title: 'Business Share Invested',
        message: `Rs. ${amount.toLocaleString()} has been added to your business share portfolio${deductFromBalance ? ' via auto-deduction from your main balance' : ''}.`,
        type: 'success',
        branchId: member.branchId,
        action: 'member_share_deposit_notification',
        metadata: { amount, shareId: shareRecord._id, link: '/member/shares' },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: 'Share Investment Confirmation',
          html: transactionEmail({
            memberName: member.name,
            transactionType: deductFromBalance
              ? 'Share Investment (Auto-Deduction)'
              : 'Share Investment',
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: updatedMember.shareBalance.toLocaleString(),
            branchName: branchName,
            reference: shareRecord._id.toString().slice(-8).toUpperCase(),
          }),
        });
      }
    } catch (notifError) {
      console.error('Share Deposit Notification Error:', notifError);
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'member_share_invested',
      category: 'member',
      details: `Added share investment of ${amount} for member: ${member.name}${deductFromBalance ? ' (Deducted from balance)' : ''}`,
      metadata: {
        memberId: id,
        amount,
        shareId: shareRecord._id,
        deducted: deductFromBalance,
      },
      req,
    });

    // Update member's credit limit
    await updateMemberCreditLimit(id);

    res.status(201).json({ shareRecord, member: updatedMember });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Add Share Investment Error:', error);
    res.status(500).json({ message: 'Failed to add share investment' });
  }
};

// @desc  Withdraw from business share balance
// @route POST /api/members/:id/share-withdraw
// @access Private (Admin/Staff)
const withdrawShareInvestment = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    if (member.shareBalance < amount) {
      return res
        .status(400)
        .json({ message: 'Insufficient share balance for withdrawal' });
    }

    // Update member share balance atomically
    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, user: userId },
      { $inc: { shareBalance: -amount } },
      { new: true },
    );

    if (!updatedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const shareRecord = await BusinessShare.create({
      user: userId,
      member: id,
      branchId: member.branchId,
      type: 'share_withdrawal',
      amount,
      description: description || 'Business share withdrawal',
      shareBalanceAfter: updatedMember.shareBalance,
    });

    await FinancialTransaction.create({
      user: userId,
      branchId: member.branchId,
      type: 'debit',
      category: 'withdrawal',
      amount,
      date: new Date(),
      description: description || 'Business share withdrawal',
      member: member._id,
      referenceId: shareRecord._id,
      referenceModel: 'BusinessShare',
    });

    try {
      await createTransactionNotification({
        recipientId: member._id,
        title: 'Business Share Withdrawal',
        message: `Rs. ${amount.toLocaleString()} has been withdrawn from your business share portfolio.`,
        type: 'info',
        branchId: member.branchId,
        action: 'member_share_withdrawal_notification',
        metadata: { amount, shareId: shareRecord._id, link: '/member/shares' },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: 'Share Withdrawal Confirmation',
          html: transactionEmail({
            memberName: member.name,
            transactionType: 'Share Withdrawal',
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: updatedMember.shareBalance.toLocaleString(),
            branchName: branchName,
            reference: shareRecord._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (notifError) {
      console.error('Share Withdrawal Notification Error:', notifError);
    }

    await logActivity({
      userId: req.user._id,
      action: 'member_share_withdrawn',
      category: 'member',
      details: `Processed share withdrawal of ${amount} for member: ${member.name}`,
      metadata: { memberId: id, amount },
      req,
    });

    // Update member's credit limit
    await updateMemberCreditLimit(id);

    res.status(201).json({ shareRecord, member });
  } catch (error) {
    console.error('Withdraw Share Investment Error:', error);
    res.status(500).json({ message: 'Failed to withdraw share investment' });
  }
};

// @desc   Transfer Business Share from one member to another (admin/staff only)
// @route  POST /api/members/admin/transfer-share
// @access Private (business users; members cannot reach this — it is mounted
//         behind `protect`, the member portal uses `protectMember`)
//
// A share transfer is modelled as a `share_withdrawal` on the sender + a
// `share_deposit` on the recipient rather than a dedicated type. This keeps it
// in lockstep with every share aggregation that already exists — the
// reconciliation share check (deposited − withdrawn + profit), the
// weighted-average share-balance calc, and the balance-sheet share-cash figure
// (shareBalance − totalShareProfit). The tenant-wide share liability is
// unchanged by a transfer, so the books still foot. Mirrors adminTransferFunds.
const transferShareBetweenMembers = async (req, res) => {
  const { senderId, recipientIdentifier, description } = req.body;

  // A share transfer always moves the member's ENTIRE share balance — there is
  // no partial amount. The amount is derived server-side from the sender so it
  // can't be under/over-stated by the client.
  if (!senderId || !recipientIdentifier) {
    return res
      .status(400)
      .json({ message: 'Sender and recipient are required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantOwnerId = req.user.effectiveOwnerId || req.user._id;

    // Sender must belong to the calling business.
    const sender = await Member.findOne({
      _id: senderId,
      user: tenantOwnerId,
    }).session(session);
    if (!sender) throw new Error('Sender member not found');

    // Branch managers may only move shares within their managed branch.
    if (
      req.user.managedBranchId &&
      String(sender.branchId) !== String(req.user.managedBranchId)
    ) {
      throw new Error('Sender is outside your branch');
    }

    // Move the full share balance.
    const transferAmount = Math.round(sender.shareBalance || 0);
    if (transferAmount <= 0) {
      throw new Error('Member has no share balance to transfer');
    }

    // Resolve recipient within the SAME tenant (prevents cross-tenant IDOR).
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const identifier = String(recipientIdentifier || '');
    const exact = escapeRegex(identifier);
    const recipient = await Member.findOne({
      user: tenantOwnerId,
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
        { savingAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
        { currentAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
      ],
    }).session(session);

    if (!recipient) throw new Error('Recipient not found');
    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer shares to the same member');
    }
    if (
      req.user.managedBranchId &&
      String(recipient.branchId) !== String(req.user.managedBranchId)
    ) {
      throw new Error('Recipient is outside your branch');
    }

    // Debit sender — concurrency-safe `$gte` guard so two parallel transfers
    // can't both pass the read-then-decrement check and overdraw the balance.
    const senderRes = await Member.updateOne(
      { _id: sender._id, shareBalance: { $gte: transferAmount } },
      { $inc: { shareBalance: -transferAmount } },
      { session },
    );
    if (senderRes.modifiedCount !== 1) {
      throw new Error('Insufficient share balance');
    }

    // Credit recipient. totalShareInvested rises just as a received fund
    // transfer credits totalInvested — keeps the reconciliation share check
    // (deposited − withdrawn + profit) matching the new shareBalance.
    await Member.updateOne(
      { _id: recipient._id },
      { $inc: { shareBalance: transferAmount, totalShareInvested: transferAmount } },
      { session },
    );

    const updatedSender = await Member.findById(sender._id).session(session);
    const updatedRecipient = await Member.findById(recipient._id).session(
      session,
    );

    // Ledger rows: withdrawal on the sender, deposit on the recipient, each
    // tagged with the counterparty so the UI can label it as a transfer.
    await BusinessShare.create(
      [
        {
          user: tenantOwnerId,
          member: sender._id,
          branchId: sender.branchId,
          type: 'share_withdrawal',
          amount: transferAmount,
          description: description || `Share transfer to ${recipient.name}`,
          shareBalanceAfter: updatedSender.shareBalance,
          metadata: {
            transfer: true,
            direction: 'send',
            counterpartyId: recipient._id,
            counterpartyName: recipient.name,
          },
        },
        {
          user: tenantOwnerId,
          member: recipient._id,
          branchId: recipient.branchId,
          type: 'share_deposit',
          amount: transferAmount,
          description: description || `Share transfer from ${sender.name}`,
          shareBalanceAfter: updatedRecipient.shareBalance,
          metadata: {
            transfer: true,
            direction: 'receive',
            counterpartyId: sender._id,
            counterpartyName: sender.name,
          },
        },
      ],
      { session, ordered: true },
    );

    await ActivityLog.create(
      [
        {
          user: tenantOwnerId,
          action: 'member_share_transfer',
          category: 'member',
          details: `${req.user.name} transferred share Rs. ${transferAmount.toLocaleString()} from ${sender.name} to ${recipient.name}`,
          metadata: {
            senderId: sender._id,
            recipientId: recipient._id,
            amount: transferAmount,
            initiatedBy: req.user.role,
          },
          branchId: req.user.branchId || sender.branchId,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Recompute both members' credit limits (share balance can feed it).
    try {
      await Promise.all([
        updateMemberCreditLimit(sender._id),
        updateMemberCreditLimit(recipient._id),
      ]);
    } catch (limitErr) {
      console.error('Share Transfer Credit Limit Error:', limitErr);
    }

    // Notify both members (outside the transaction).
    try {
      await Promise.all([
        createTransactionNotification({
          recipientId: sender._id,
          title: 'Business Share Transferred',
          message: `Rs. ${transferAmount.toLocaleString()} was transferred from your business share to ${recipient.name}.`,
          type: 'info',
          branchId: sender.branchId,
          action: 'member_share_transfer_notification',
          metadata: { amount: transferAmount, link: '/member/shares' },
        }),
        createTransactionNotification({
          recipientId: recipient._id,
          title: 'Business Share Received',
          message: `Rs. ${transferAmount.toLocaleString()} was added to your business share from ${sender.name}.`,
          type: 'success',
          branchId: recipient.branchId,
          action: 'member_share_transfer_notification',
          metadata: { amount: transferAmount, link: '/member/shares' },
        }),
      ]);
    } catch (notifError) {
      console.error('Share Transfer Notification Error:', notifError);
    }

    res.status(200).json({
      message: 'Share transfer successful',
      recipientName: recipient.name,
      senderShareBalance: updatedSender.shareBalance,
      recipientShareBalance: updatedRecipient.shareBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc  Distribute share profit to all active members with share balance
//        Profit is proportional to shareBalance.
//        Credited to: shareBalance (re-invested) + totalProfit (net profit reporting)
// @route POST /api/members/distribute-share-profit
// @access Private (Admin)
const distributeShareProfit = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      totalProfit: profitPool,
      period,
      description,
      useCustomRates,
      startDate,
      endDate,
    } = req.body;

    if (!useCustomRates && (!profitPool || profitPool <= 0)) {
      return res.status(400).json({ message: 'Invalid profit amount' });
    }

    const now = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const members = await Member.find({
      user: userId,
      status: 'Active',
      shareBalance: { $gt: 0 },
    });
    if (members.length === 0) {
      return res
        .status(400)
        .json({ message: 'No active members with share investments found' });
    }

    const distributions = [];

    // Calculate all weighted balances first
    const memberShares = await Promise.all(
      members.map(async (m) => ({
        member: m,
        weightedShareBalance: await calculateWeightedAverageBalance(
          m._id,
          periodStart,
          periodEnd,
          'share',
        ),
      })),
    );

    const totalWeightedSharePool = memberShares.reduce(
      (sum, item) => sum + item.weightedShareBalance,
      0,
    );

    if (totalWeightedSharePool === 0 && !useCustomRates) {
      return res
        .status(400)
        .json({ message: 'No weighted average share balance found in period' });
    }

    // Largest-remainder allocation for the proportional (pool-based) path so the
    // sum of credited share-profit equals the declared pool EXACTLY. The custom-rate
    // path is per-member (rate% of own balance) and has no pool to conserve.
    const shareAllocations = (() => {
      if (useCustomRates || totalWeightedSharePool === 0) return new Map();
      const eligible = memberShares.filter((i) => i.weightedShareBalance > 0);
      const rows = eligible.map((i) => {
        const exact =
          (i.weightedShareBalance / totalWeightedSharePool) * profitPool;
        const floorAmt = Math.floor(exact);
        return {
          id: String(i.member._id),
          amount: floorAmt,
          frac: exact - floorAmt,
        };
      });
      let leftover = Math.round(
        profitPool - rows.reduce((s, r) => s + r.amount, 0),
      );
      rows
        .slice()
        .sort((a, b) => b.frac - a.frac)
        .forEach((r) => {
          if (leftover > 0) {
            r.amount += 1;
            leftover -= 1;
          }
        });
      return new Map(rows.map((r) => [r.id, r.amount]));
    })();

    for (const item of memberShares) {
      const { member, weightedShareBalance } = item;
      let profitAmount = 0;
      let calculationInfo = '';
      let sharePercent = 0;

      if (useCustomRates) {
        if (member.shareProfitRate > 0) {
          profitAmount = Math.round(
            (weightedShareBalance * member.shareProfitRate) / 100,
          );
          calculationInfo = `Custom rate: ${member.shareProfitRate}% on Weighted Avg Share Balance (Rs. ${Math.round(weightedShareBalance).toLocaleString()})`;
          sharePercent = member.shareProfitRate;
        } else {
          continue;
        }
      } else {
        if (weightedShareBalance > 0) {
          sharePercent = (weightedShareBalance / totalWeightedSharePool) * 100;
          profitAmount = shareAllocations.get(String(member._id)) || 0;
          calculationInfo = `Proportional: ${sharePercent.toFixed(2)}% of pool based on Weighted Avg Share Balance (Rs. ${Math.round(weightedShareBalance).toLocaleString()})`;
        }
      }

      if (profitAmount <= 0) continue;

      // Credit profit to share balance, book the BusinessShare record, the
      // ProfitDistribution row AND the ledger row as ONE atomic unit. Without a
      // transaction a mid-loop crash leaves a member's shareBalance bumped with
      // no matching records (or records with no credit) — the orphan-row /
      // missing-income drift the backfill scripts exist to repair.
      // NOTE: totalProfit must NOT be incremented here. It tracks profit credited
      // to currentBalance only; share profits live in shareBalance and are
      // tracked by totalShareProfit. Including them in totalProfit caused the
      // Member Balance reconciliation to flag a phantom drift equal to the
      // cumulative share profit (currentBalance never sees this money).
      let shareRecord;
      let updatedMember;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Keep { new: true } — shareBalanceAfter reads the updated doc.
          updatedMember = await Member.findByIdAndUpdate(
            member._id,
            {
              $inc: {
                shareBalance: profitAmount,
                totalShareProfit: profitAmount,
              },
            },
            { new: true, session },
          );

          [shareRecord] = await BusinessShare.create(
            [
              {
                user: userId,
                member: member._id,
                branchId: member.branchId,
                type: 'share_profit',
                amount: profitAmount,
                description:
                  description ||
                  `Share profit (Weighted Avg) for ${period || periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                shareBalanceAfter: updatedMember.shareBalance,
                period:
                  period ||
                  periodStart.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  }),
              },
            ],
            { session },
          );

          // Create Profit Distribution record (Unified Hub)
          await ProfitDistribution.create(
            [
              {
                user: userId,
                member: member._id,
                branchId: member.branchId,
                amount: profitAmount,
                type: 'share',
                period:
                  period ||
                  periodStart.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  }),
                calculationMethod: calculationInfo,
                investmentShare: sharePercent,
              },
            ],
            { session },
          );

          // FinancialTransaction
          await FinancialTransaction.create(
            [
              {
                user: userId,
                branchId: member.branchId,
                type: 'expense',
                category: 'profit_distribution',
                amount: profitAmount,
                date: new Date(),
                description: `Share profit: ${calculationInfo}`,
                member: member._id,
                referenceId: shareRecord._id,
                referenceModel: 'BusinessShare',
                paymentMethod: 'online',
              },
            ],
            { session },
          );
        });
      } finally {
        await session.endSession();
      }

      // Notify member
      try {
        await createTransactionNotification({
          recipientId: member._id,
          title: 'Share Profit Credited',
          message: `Rs. ${profitAmount.toLocaleString()} share profit added. Calculated on Weighted Avg Share Balance of Rs. ${Math.round(weightedShareBalance).toLocaleString()}.`,
          type: 'success',
          branchId: member.branchId,
          action: 'member_share_profit_notification',
          metadata: {
            amount: profitAmount,
            shareId: shareRecord._id,
            link: '/member/shares',
          },
        });

        // Send Email Notification (non-blocking)
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);
        sendEmailAsync({
          to: member.email,
          subject: `Share Profit Credited - ${branchName}`,
          html: transactionEmail({
            memberName: member.name,
            transactionType: 'Share Profit Distribution',
            amount: profitAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            balance: (member.shareBalance + profitAmount).toLocaleString(),
            reference: shareRecord._id.toString().slice(-8).toUpperCase(),
            branchName: branchName,
            logoUrl: logoUrl,
          }),
        });
      } catch (notifError) {
        console.error('Share Profit Notification Error:', notifError);
      }

      // Update credit limit after profit distribution
      await updateMemberCreditLimit(member._id);

      distributions.push(shareRecord);
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'share_profit_distributed',
      category: 'member',
      details: `Distributed share profit to ${distributions.length} members for ${period} using ${useCustomRates ? 'custom rates' : 'proportional method'}`,
      metadata: {
        profitPool: useCustomRates ? 'Custom Rates' : profitPool,
        period,
        membersCount: distributions.length,
        method: useCustomRates ? 'custom' : 'proportional',
      },
      req,
    });

    res.status(201).json({
      message: 'Share profit distributed successfully',
      distributions,
      totalDistributed: distributions.reduce((sum, d) => sum + d.amount, 0),
      membersCount: distributions.length,
    });
  } catch (error) {
    console.error('Distribute Share Profit Error:', error);
    res.status(500).json({ message: 'Failed to distribute share profit' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getPortalShares,
  getMemberShares,
  addShareInvestment,
  withdrawShareInvestment,
  transferShareBetweenMembers,
  distributeShareProfit,
};
