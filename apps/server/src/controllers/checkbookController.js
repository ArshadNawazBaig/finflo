const mongoose = require('mongoose');
const Checkbook = require('../models/Checkbook');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const FinancialTransaction = require('../models/FinancialTransaction');
const Notification = require('../models/Notification');
const { logActivity } = require('./activityLogController');
const {
  createTransactionNotification,
} = require('../utils/notificationHelper');

// @desc    Issue a checkbook to a member
// @route   POST /api/checkbooks/issue
// @access  Private (Admin/Staff)
const issueCheckbook = async (req, res) => {
  const { memberId, numberOfLeaves = 25, notes = '' } = req.body;

  if (!memberId) {
    return res.status(400).json({ message: 'Member ID is required' });
  }

  if (![25, 50, 100].includes(numberOfLeaves)) {
    return res
      .status(400)
      .json({ message: 'Invalid number of leaves. Must be 25, 50, or 100' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.effectiveOwnerId;

    // Fetch checkbook fee from the business owner's config (per-leaf pricing)
    const User = require('../models/User');
    const adminUser = await User.findById(userId).select('checkbookFee checkbookFees');
    // Per-leaf pricing first, fallback to legacy flat fee
    const feesMap = adminUser?.checkbookFees || {};
    const fee = feesMap[numberOfLeaves] ?? adminUser?.checkbookFee ?? 0;

    // Fetch member
    const member = await Member.findOne({
      _id: memberId,
      user: userId,
    }).session(session);

    if (!member) {
      throw new Error('Member not found');
    }

    // Check current account balance
    if (member.currentBalance < fee) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient balance in current account. Required: ${fee}, Available: ${member.currentBalance}. Please add balance to the current account first.`,
        required: fee,
        available: member.currentBalance,
      });
    }

    // Generate checkbook number
    const checkbookNumber =
      await Checkbook.generateCheckbookNumber(userId);

    // Deduct fee from member's current account
    await Member.updateOne(
      { _id: memberId },
      {
        $inc: {
          currentBalance: -fee,
          totalWithdrawn: fee,
        },
      },
      { session },
    );

    // Refresh member for updated balance
    const updatedMember = await Member.findById(memberId).session(session);

    // Create checkbook record
    const checkbook = await Checkbook.create(
      [
        {
          user: userId,
          member: memberId,
          branchId: member.branchId,
          checkbookNumber,
          fee,
          numberOfLeaves,
          status: 'active',
          issuedBy: req.user._id,
          notes,
        },
      ],
      { session },
    );

    const checkbookDoc = checkbook[0];

    // Create investment record (withdrawal for the fee)
    const investment = await Investment.create(
      [
        {
          user: userId,
          member: memberId,
          branchId: member.branchId,
          type: 'withdrawal',
          amount: fee,
          accountType: 'current',
          description: `Checkbook Fee — ${checkbookNumber} (${numberOfLeaves} leaves)`,
          balanceAfter: updatedMember.currentBalance,
          date: new Date(),
        },
      ],
      { session },
    );

    // Create financial transaction for ledger
    await FinancialTransaction.create(
      [
        {
          user: userId,
          branchId: member.branchId,
          type: 'income',
          category: 'checkbook_fee',
          amount: fee,
          date: new Date(),
          description: `Checkbook Fee — ${checkbookNumber} issued to ${member.name}`,
          member: memberId,
          referenceId: checkbookDoc._id,
          referenceModel: 'Checkbook',
          paymentMethod: 'online',
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // Log activity (outside transaction)
    await logActivity({
      userId: req.user._id,
      action: 'checkbook_issued',
      category: 'member',
      details: `Issued checkbook ${checkbookNumber} (${numberOfLeaves} leaves) to ${member.name}. Fee: ${fee}`,
      metadata: {
        memberId,
        checkbookId: checkbookDoc._id,
        checkbookNumber,
        fee,
        numberOfLeaves,
      },
      req,
    });

    // Send notification to member
    try {
      await createTransactionNotification({
        recipientId: memberId,
        title: 'Checkbook Issued',
        message: `A checkbook (${checkbookNumber}) with ${numberOfLeaves} leaves has been issued to your account. Fee of Rs. ${fee.toLocaleString()} has been deducted from your current account.`,
        type: 'info',
        branchId: member.branchId,
        action: 'checkbook_issued',
        metadata: {
          checkbookId: checkbookDoc._id,
          checkbookNumber,
          fee,
          link: '/member/transactions',
        },
      });
    } catch (notifError) {
      console.error('Failed to send checkbook notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: `Checkbook ${checkbookNumber} issued successfully. Fee of Rs. ${fee} deducted from current account.`,
      checkbook: checkbookDoc,
      newBalance: updatedMember.currentBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Issue Checkbook Error:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to issue checkbook' });
  } finally {
    session.endSession();
  }
};

// @desc    Get checkbooks for a specific member (Admin/Staff)
// @route   GET /api/checkbooks/member/:memberId
// @access  Private (Admin/Staff)
const getMemberCheckbooks = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { memberId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: userId, member: memberId };
    if (status) {
      query.status = status;
    }

    const [checkbooks, total] = await Promise.all([
      Checkbook.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('issuedBy', 'name')
        .populate('cancelledBy', 'name'),
      Checkbook.countDocuments(query),
    ]);

    res.json({
      checkbooks,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Get Member Checkbooks Error:', error);
    res.status(500).json({ message: 'Failed to fetch checkbooks' });
  }
};

// @desc    Get own checkbooks (Member Portal)
// @route   GET /api/checkbooks/portal
// @access  Private (Member)
const getPortalCheckbooks = async (req, res) => {
  try {
    const memberId = req.member._id;
    const { page = 1, limit = 10 } = req.query;

    const query = { member: memberId };

    const [checkbooks, total] = await Promise.all([
      Checkbook.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('issuedBy', 'name'),
      Checkbook.countDocuments(query),
    ]);

    res.json({
      checkbooks,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Get Portal Checkbooks Error:', error);
    res.status(500).json({ message: 'Failed to fetch checkbooks' });
  }
};

// @desc    Cancel a checkbook (with optional refund)
// @route   PUT /api/checkbooks/:id/cancel
// @access  Private (Admin/Staff)
const cancelCheckbook = async (req, res) => {
  const { refund = false } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const checkbook = await Checkbook.findOne({
      _id: id,
      user: userId,
      status: 'active',
    }).session(session);

    if (!checkbook) {
      await session.abortTransaction();
      return res.status(404).json({
        message: 'Checkbook not found or already cancelled/used',
      });
    }

    // Update checkbook status
    checkbook.status = 'cancelled';
    checkbook.cancelledBy = req.user._id;
    checkbook.cancelledAt = new Date();
    checkbook.refunded = refund;
    await checkbook.save({ session });

    // If refund requested, credit the fee back to member's current account
    if (refund) {
      await Member.updateOne(
        { _id: checkbook.member },
        {
          $inc: {
            currentBalance: checkbook.fee,
            totalInvested: checkbook.fee,
          },
        },
        { session },
      );

      const updatedMember = await Member.findById(checkbook.member).session(
        session,
      );

      // Create refund investment record
      await Investment.create(
        [
          {
            user: userId,
            member: checkbook.member,
            branchId: checkbook.branchId,
            type: 'deposit',
            amount: checkbook.fee,
            accountType: 'current',
            description: `Checkbook Refund — ${checkbook.checkbookNumber} (Cancelled)`,
            balanceAfter: updatedMember.currentBalance,
            date: new Date(),
          },
        ],
        { session },
      );

      // Create refund financial transaction
      await FinancialTransaction.create(
        [
          {
            user: userId,
            branchId: checkbook.branchId,
            type: 'expense',
            category: 'checkbook_fee',
            amount: checkbook.fee,
            date: new Date(),
            description: `Checkbook Refund — ${checkbook.checkbookNumber} cancelled`,
            member: checkbook.member,
            referenceId: checkbook._id,
            referenceModel: 'Checkbook',
            paymentMethod: 'online',
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();

    // Fetch member name for logging
    const member = await Member.findById(checkbook.member).select('name');

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'checkbook_cancelled',
      category: 'member',
      details: `Cancelled checkbook ${checkbook.checkbookNumber} for ${member?.name || 'Unknown'}${refund ? ' (Refunded)' : ''}`,
      metadata: {
        checkbookId: checkbook._id,
        checkbookNumber: checkbook.checkbookNumber,
        refunded: refund,
      },
      req,
    });

    // Notify member
    try {
      await createTransactionNotification({
        recipientId: checkbook.member,
        title: 'Checkbook Cancelled',
        message: `Your checkbook (${checkbook.checkbookNumber}) has been cancelled.${refund ? ` A refund of Rs. ${checkbook.fee.toLocaleString()} has been credited to your current account.` : ''}`,
        type: 'warning',
        branchId: checkbook.branchId,
        action: 'checkbook_cancelled',
        metadata: {
          checkbookId: checkbook._id,
          checkbookNumber: checkbook.checkbookNumber,
          refunded: refund,
        },
      });
    } catch (notifError) {
      console.error(
        'Failed to send checkbook cancellation notification:',
        notifError,
      );
    }

    res.json({
      success: true,
      message: `Checkbook ${checkbook.checkbookNumber} cancelled${refund ? ' and refunded' : ''} successfully.`,
      checkbook,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Cancel Checkbook Error:', error);
    res.status(500).json({ message: 'Failed to cancel checkbook' });
  } finally {
    session.endSession();
  }
};

module.exports = {
  issueCheckbook,
  getMemberCheckbooks,
  getPortalCheckbooks,
  cancelCheckbook,
};
