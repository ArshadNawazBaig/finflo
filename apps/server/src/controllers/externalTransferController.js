const mongoose = require('mongoose');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const ExternalTransfer = require('../models/ExternalTransfer');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../utils/notificationHelper');
const Loan = require('../models/Loan');
const loanRepaymentService = require('../services/loanRepaymentService');
const { escapeRegExp } = require('../utils/stringUtils');
const payoutService = require('../services/payoutService');

/**
 * @desc  Initiate an external bank / wallet transfer (send money out)
 * @route POST /api/external-transfers
 * @access Private (Member)
 */
const initiateExternalTransfer = async (req, res) => {
  const {
    bankType,
    bankName,
    accountIdentifier,
    accountTitle,
    amount,
    description,
  } = req.body;
  const memberId = req.member._id;
  const userId = req.member.user;
  const branchId = req.member.branchId;

  if (
    !bankType ||
    !bankName ||
    !accountIdentifier ||
    !amount ||
    parseFloat(amount) <= 0
  ) {
    return res.status(400).json({ message: 'Invalid transfer details' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const member = await Member.findById(memberId).session(session);
    if (!member) throw new Error('Member not found');

    const transferAmount = parseFloat(amount);

    // Debit balance atomically
    const updatedMember = await Member.findOneAndUpdate(
      { _id: memberId, currentBalance: { $gte: transferAmount } },
      {
        $inc: {
          currentBalance: -transferAmount,
          totalWithdrawn: transferAmount,
        },
      },
      { session, new: true },
    );

    if (!updatedMember) {
      throw new Error('Insufficient balance or member not found');
    }

    // Create ExternalTransfer record
    const [ext] = await ExternalTransfer.create(
      [
        {
          member: memberId,
          user: userId,
          branchId,
          direction: 'send',
          bankType,
          bankName,
          accountIdentifier,
          accountTitle,
          amount: transferAmount,
          description: description || `Transfer to ${bankName}`,
          status: 'Pending', // Initial status is now Pending for real transfers
          balanceAfter: updatedMember.currentBalance,
        },
      ],
      { session },
    );

    // ── Attempt Real Payout ───────────────────────────────────────────────
    let payoutResult;
    try {
      payoutResult = await payoutService.sendTransfer({
        bankCode: bankName, // Or map bankName to bankCode if provider requires codes
        accountIdentifier,
        accountTitle,
        amount: transferAmount,
        reference: ext.referenceId,
      });

      // Update transfer with provider reference if successful
      if (payoutResult.success) {
        ext.status = payoutResult.status; // e.g. 'Processing' or 'Pending'
        ext.metadata = {
          ...ext.metadata,
          providerRef: payoutResult.transactionId,
        };
        await ext.save({ session });
      }
    } catch (payoutError) {
      console.error('Payout Initiation Failed:', payoutError.message);
      // We could either fail the whole request or keep it as 'Pending' for manual retry
      // For now, let's keep it 'Pending' so admins can see it even if API failed once
    }

    await Investment.create(
      [
        {
          user: userId,
          member: memberId,
          branchId,
          type: 'withdrawal',
          amount: transferAmount,
          description: `External Transfer to ${bankName} — Ref: ${ext.referenceId}`,
          balanceAfter: updatedMember.currentBalance,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // ── Goal round-up auto-contribute (best-effort) ────────────────────────
    try {
      const { applyRoundupOnDebit } = require('../services/goalAutoContribute');
      await applyRoundupOnDebit({
        memberId,
        debitAmount: transferAmount,
      });
    } catch (roundupErr) {
      console.warn(
        '[ExternalTransfer] roundup hook failed:',
        roundupErr.message,
      );
    }

    // ── Notifications ──────────────────────────────────────────────────────
    try {
      await createTransactionNotification({
        recipientId: memberId,
        title: 'External Transfer Sent',
        message: `Your transfer of Rs. ${transferAmount.toLocaleString()} to ${bankName} (${accountIdentifier}) has been processed.`,
        type: 'info',
        branchId,
        action: 'external_transfer_sent',
        metadata: {
          amount: transferAmount,
          bankName,
          referenceId: ext.referenceId,
          link: '/member/transactions',
        },
      });

      // Notify Admins
      await notifyAdminsOfMemberAction({
        title: 'External Transfer Sent',
        message: `${member.name} sent Rs. ${transferAmount.toLocaleString()} to ${bankName} (${accountIdentifier}).`,
        type: 'warning',
        branchId,
        ownerId: userId,
        metadata: {
          memberId,
          bankName,
          amount: transferAmount,
          link: '/transactions',
        },
      });
    } catch (notifError) {
      console.error('External Send Notification Error:', notifError);
    }

    return res.status(201).json({
      message: 'Transfer initiated successfully',
      referenceId: ext.referenceId,
      balanceAfter: updatedMember.currentBalance,
      transfer: ext,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('External Transfer Error:', error);
    return res
      .status(400)
      .json({ message: error.message || 'Transfer failed' });
  } finally {
    session.endSession();
  }
};

/**
 * @desc  Record an incoming external transfer (receive money)
 * @route POST /api/external-transfers/receive
 * @access Private (Member)
 */
const recordExternalReceive = async (req, res) => {
  const { bankType, bankName, accountIdentifier, amount, description } =
    req.body;
  const memberId = req.member._id;
  const userId = req.member.user;
  const branchId = req.member.branchId;

  if (
    !bankType ||
    !bankName ||
    !accountIdentifier ||
    !amount ||
    parseFloat(amount) <= 0
  ) {
    return res.status(400).json({ message: 'Invalid receive details' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const member = await Member.findById(memberId).session(session);
    if (!member) throw new Error('Member not found');

    const receiveAmount = parseFloat(amount);

    // Credit balance atomically
    const updatedMember = await Member.findOneAndUpdate(
      { _id: memberId },
      { $inc: { currentBalance: receiveAmount, totalInvested: receiveAmount } },
      { session, new: true },
    );

    if (!updatedMember) {
      throw new Error('Member not found');
    }

    // Create ExternalTransfer record
    const [ext] = await ExternalTransfer.create(
      [
        {
          member: memberId,
          user: userId,
          branchId,
          direction: 'receive',
          bankType,
          bankName,
          accountIdentifier,
          amount: receiveAmount,
          description: description || `Received from ${bankName}`,
          status: 'completed',
          balanceAfter: updatedMember.currentBalance,
        },
      ],
      { session },
    );

    await Investment.create(
      [
        {
          user: userId,
          member: memberId,
          branchId,
          type: 'deposit',
          amount: receiveAmount,
          description: `External Receive from ${bankName} — Ref: ${ext.referenceId}`,
          balanceAfter: updatedMember.currentBalance,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // ── Automatic Loan Deduction ───────────────────────────────────────────
    try {
      // Tenant scope + deterministic ordering (oldest active loan first), same
      // pattern as the deposit auto-deduction in memberController.addInvestment.
      const activeLoan = await Loan.findOne({
        customer: req.member.customer,
        user: userId,
        status: 'active',
      }).sort({ createdAt: 1 });

      if (activeLoan) {
        const deductionAmount = Math.min(
          receiveAmount,
          activeLoan.remainingAmount,
        );
        if (deductionAmount > 0) {
          const context = {
            user: { effectiveOwnerId: member.user, branchId: member.branchId },
          };
          await loanRepaymentService.processRepayment(
            activeLoan,
            deductionAmount,
            context,
            {
              notes: `Auto-deduction from external receive: ${bankName}`,
              isAutoValue: true,
            },
          );
        }
      }
    } catch (autoRepoError) {
      console.error(
        'Auto Repayment Error in recordExternalReceive:',
        autoRepoError,
      );
    }

    // ── Notifications ──────────────────────────────────────────────────────
    try {
      await createTransactionNotification({
        recipientId: memberId,
        title: 'External Funds Received',
        message: `You have successfully recorded an incoming transfer of Rs. ${receiveAmount.toLocaleString()} from ${bankName}.`,
        type: 'success',
        branchId,
        action: 'external_transfer_received',
        metadata: {
          amount: receiveAmount,
          bankName,
          referenceId: ext.referenceId,
          link: '/member/transactions',
        },
      });

      // Notify Admins
      await notifyAdminsOfMemberAction({
        title: 'External Funds Received',
        message: `${member.name} recorded an incoming transfer of Rs. ${receiveAmount.toLocaleString()} from ${bankName}.`,
        type: 'success',
        branchId,
        ownerId: userId,
        metadata: {
          memberId,
          bankName,
          amount: receiveAmount,
          link: '/transactions',
        },
      });
    } catch (notifError) {
      console.error('External Receive Notification Error:', notifError);
    }

    return res.status(201).json({
      message: 'Incoming transfer recorded',
      referenceId: ext.referenceId,
      balanceAfter: updatedMember.currentBalance,
      transfer: ext,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Record Receive Error:', error);
    return res
      .status(400)
      .json({ message: error.message || 'Failed to record transfer' });
  } finally {
    session.endSession();
  }
};

/**
 * @desc  Get the logged-in member's external transfer history
 * @route GET /api/external-transfers
 * @access Private (Member)
 */
const getMyExternalTransfers = async (req, res) => {
  try {
    const memberId = req.member._id;
    const { direction, bankName, page = 1, limit = 10 } = req.query;

    const query = { member: memberId };
    if (direction) query.direction = direction;
    if (bankName) query.bankName = { $regex: escapeRegExp(String(bankName)), $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transfers, total] = await Promise.all([
      ExternalTransfer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ExternalTransfer.countDocuments(query),
    ]);

    return res.json({
      data: transfers,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Get External Transfers Error:', error);
    return res
      .status(500)
      .json({ message: 'Failed to fetch transfer history' });
  }
};

// ... existing getMyExternalTransfers

/**
 * @desc  Fetch Account Title (Name Verification) before transfer
 * @route POST /api/external-transfers/resolve-title
 * @access Private (Member)
 */
const resolveExternalAccountTitle = async (req, res) => {
  const { bankCode, accountIdentifier } = req.body;

  if (!bankCode || !accountIdentifier || accountIdentifier.length < 10) {
    return res.status(400).json({ message: 'Valid Bank Code and ID required' });
  }

  try {
    const result = await payoutService.resolveAccountTitle(
      bankCode,
      accountIdentifier,
    );
    res.json(result);
  } catch (error) {
    console.error('Account Resolution Error:', error);
    res
      .status(400)
      .json({ message: error.message || 'Failed to resolve account title' });
  }
};

module.exports = {
  initiateExternalTransfer,
  recordExternalReceive,
  getMyExternalTransfers,
  resolveExternalAccountTitle,
};
