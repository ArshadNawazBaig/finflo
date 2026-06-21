const Member = require('../models/Member');
const Investment = require('../models/Investment');
const FinancialTransaction = require('../models/FinancialTransaction');
const { logActivity } = require('./activityLogController');
const {
  createTransactionNotification,
} = require('../utils/notificationHelper');
const raastService = require('../services/raastService');
const mongoose = require('mongoose');

/**
 * @desc    Handles incoming webhooks from the Partner Bank (Raast payments)
 * @route   POST /api/webhooks/raast
 * @access  Public
 */
const handleRaastWebhook = async (req, res) => {
  try {
    // 1. Verify Signature
    const signature = req.headers['x-signature'] || req.headers['signature'];
    const isValid = raastService.verifyWebhook(req.body, signature);

    if (!isValid) {
      console.warn('Raast Webhook Signature Verification Failed:', {
        body: req.body,
        signature,
      });
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Example Payload Structure (Adjust based on your Bank's actual API docs)
    // { order_reference: 'INV-123', amount: '5000', status: 'PAID', ... }
    const { order_reference, amount, status, transaction_id } = req.body;

    if (status !== 'PAID' && status !== 'SUCCESS') {
      return res
        .status(200)
        .json({ message: 'Acknowledged non-success status' });
    }

    // We stored the Investment ID in order_reference when generating the QR
    const investmentId = order_reference;

    // Find the pending investment
    const investment = await Investment.findById(investmentId).populate(
      'member branchId user',
    );

    if (!investment) {
      console.error(
        'Raast Webhook Error: Investment record not found',
        investmentId,
      );
      return res.status(404).json({ message: 'Order not found' });
    }

    if (investment.metadata?.raastStatus === 'PAID') {
      // Already processed, acknowledge to prevent bank retries
      return res.status(200).json({ message: 'Already processed' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify amounts match
      if (parseFloat(amount) !== investment.amount) {
        throw new Error(
          `Amount mismatch: Expected ${investment.amount}, got ${amount}`,
        );
      }

      // 2. Atomically CLAIM this deposit before crediting. Banks retry webhooks
      // aggressively, often in parallel — the earlier `metadata.raastStatus` read
      // was a non-atomic check, so two concurrent deliveries could both pass it and
      // double-credit the member. This conditional flip can only succeed once.
      const claimed = await Investment.findOneAndUpdate(
        { _id: investment._id, 'metadata.raastStatus': { $ne: 'PAID' } },
        {
          $set: {
            status: 'Completed',
            'metadata.raastStatus': 'PAID',
            'metadata.raastTransactionId': transaction_id,
            'metadata.paidAt': new Date(),
          },
        },
        { new: true, session },
      );

      if (!claimed) {
        // Another delivery already processed this deposit — credit exactly once.
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({ message: 'Already processed' });
      }

      // 3. Update Member Balance (only reached for the single winning delivery)
      const updatedMember = await Member.findByIdAndUpdate(
        investment.member._id,
        {
          $inc: {
            currentBalance: investment.amount,
            totalInvested: investment.amount,
          },
        },
        { new: true, session },
      );

      claimed.balanceAfter = updatedMember.currentBalance;
      await claimed.save({ session });

      // 4. Create Financial Transaction
      const financialTx = new FinancialTransaction({
        user: investment.user._id,
        branchId: investment.branchId._id,
        type: 'income',
        category: 'investment_deposit', // Map to wallet funding
        amount: investment.amount,
        date: new Date(),
        description: `Wallet funded via Raast (Ref: ${transaction_id})`,
        member: investment.member._id,
        referenceId: investment._id,
        referenceModel: 'Investment',
      });
      await financialTx.save({ session });

      // 5. Activity Logging
      await logActivity({
        userId: investment.user._id,
        action: 'member_deposit_added',
        category: 'member',
        details: `Processed Raast deposit of ${investment.amount} for member: ${updatedMember.name}`,
        metadata: {
          memberId: updatedMember._id,
          amount: investment.amount,
          investmentId: investment._id,
          method: 'Raast P2M',
          transaction_id,
        },
        req: { ip: req.ip, headers: req.headers }, // Mock req for logger
      });

      await session.commitTransaction();

      // Non-blocking notifications
      try {
        await createTransactionNotification({
          recipientId: updatedMember._id,
          title: 'Deposit Received',
          message: `Your wallet has been funded with Rs. ${investment.amount.toLocaleString()} via Raast.`,
          type: 'success',
          branchId: updatedMember.branchId,
          action: 'member_deposit_notification',
          metadata: {
            amount: investment.amount,
            investmentId: investment._id,
            link: '/member/wallet',
          },
        });
      } catch (notifErr) {
        console.error('Notification Error post-Raast confirmation:', notifErr);
      }

      res.status(200).json({ message: 'Success', transaction_id });
    } catch (txnError) {
      await session.abortTransaction();
      throw txnError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Handle Raast Webhook Error:', error);
    res.status(500).json({ message: 'Internal Webhook Processing Error' });
  }
};

module.exports = {
  handleRaastWebhook,
};
