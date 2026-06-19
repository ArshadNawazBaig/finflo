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
const { escapeRegExp, capitalizeName } = require('../../utils/stringUtils');
const { roundMoney } = require('../../utils/money');
const { parseBoolean } = require('../../utils/parseQuery');

/**
 * @desc    Initiate a Raast P2M Deposit via Bank API
 * @route   POST /api/members/portal/raast-deposit
 * @access  Private (Member)
 */
const initiateRaastDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const memberId = req.member._id;
    const userId = req.member.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    // 1. Create a "Pending" Investment record that the Webhook will finalize
    const pendingInvestment = await Investment.create({
      user: userId,
      member: memberId,
      branchId: req.member.branchId,
      type: 'deposit',
      amount,
      description: 'Wallet deposit via Raast',
      balanceAfter: req.member.currentBalance,
      status: 'Pending',
      metadata: {
        method: 'Raast P2M',
        raastStatus: 'PENDING',
      },
    });

    // 2. Generate the Raast QR / Intent via Service
    const raastResponse = await raastService.generateDynamicQR(
      amount,
      pendingInvestment._id.toString(),
    );

    res.status(200).json({
      success: true,
      data: raastResponse, // Contains qrCode or intentUrl
      investmentId: pendingInvestment._id,
    });
  } catch (error) {
    console.error('Initiate Raast Deposit Error:', error);
    res.status(500).json({ message: 'Failed to initiate Raast deposit' });
  }
};

// @desc    Get all activity for a member (Investments, Profits, Repayments, Goals)
// @route   GET /api/members/portal/activity
// @access  Private (Member)
const getMemberActivity = async (req, res) => {
  try {
    const memberId = req.member._id;
    const customerId = req.member.customer;

    // Build query objects
    const investmentQuery = { member: memberId };
    const profitQuery = { member: memberId };
    const repaymentQuery = { customer: customerId };
    const goalLogQuery = { user: memberId, action: 'goal_contribution' };

    const { category, search, startDate, endDate } = req.query;

    if (startDate && endDate) {
      const dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
      investmentQuery.date = dateRange;
      profitQuery.date = dateRange;
      repaymentQuery.date = dateRange;
      goalLogQuery.createdAt = dateRange;
    }

    if (search) {
      const searchRegex = { $regex: escapeRegExp(String(search)), $options: 'i' };
      investmentQuery.description = searchRegex;
      // Note: Profit distributions might not have descriptions in the model,
      // but we'll apply it to the period if applicable or just filter after combining.
      repaymentQuery.notes = searchRegex;
    }

    const [investments, profits, repayments, goalLogs] = await Promise.all([
      Investment.find(investmentQuery).sort({ date: -1 }),
      ProfitDistribution.find(profitQuery).sort({ date: -1 }),
      Repayment.find(repaymentQuery).sort({ date: -1 }),
      ActivityLog.find(goalLogQuery).sort({ createdAt: -1 }),
    ]);

    // Format and combine
    const formattedInvestments = investments.map((i) => {
      const isRepayment =
        i.metadata?.isRepayment ||
        (i.description && i.description.includes('Loan repayment'));
      return {
        _id: i._id,
        type: i.type,
        category: isRepayment ? 'repayment' : 'investment',
        amount: i.amount,
        date: i.date,
        description:
          i.description ||
          (i.type === 'deposit'
            ? 'Investment Deposit'
            : i.type === 'withdrawal'
              ? 'Investment Withdrawal'
              : i.type === 'transfer_send'
                ? 'P2P Fund Transfer (Sent)'
                : 'P2P Fund Transfer (Received)'),
        status: i.status || 'Completed',
        metadata: { ...i.metadata, balanceAfter: i.balanceAfter },
      };
    });

    const formattedProfits = profits.map((p) => ({
      _id: p._id,
      type: 'deposit',
      category: 'profit',
      amount: p.amount,
      date: p.date,
      description: `Profit Distribution - ${p.period}`,
      metadata: { share: p.investmentShare },
    }));

    // Filter out repayments that are already represented as Investment withdrawals
    // (Member-initiated repayments from wallet)
    const walletRepaymentLoanIds = new Set(
      formattedInvestments
        .filter((i) => i.category === 'repayment')
        .map((i) => i.description.split('#').pop()?.substring(0, 6)), // A bit brittle, but accurate enough for descriptions
    );

    const formattedRepayments = repayments
      .filter((r) => {
        // Exclude repayments that are already represented as Investment records
        const loanShortId = r.loan.toString().slice(-6).toUpperCase();
        if (walletRepaymentLoanIds.has(loanShortId)) {
          return false;
        }

        // Fallback checks for notes if something didn't match exactly
        const isWalletRepayment =
          r.notes &&
          (r.notes.includes('FinFlo') ||
            r.notes.includes('Self-repayment') ||
            r.notes.includes('Automatic deduction'));
        return !isWalletRepayment;
      })
      .map((r) => ({
        _id: r._id,
        type: 'withdrawal',
        category: 'repayment',
        amount: r.amount,
        date: r.date,
        description: r.notes || 'Loan Repayment',
        metadata: { loanId: r.loan },
      }));

    const formattedGoalLogs = goalLogs.map((gl) => ({
      _id: gl._id,
      type: 'withdrawal',
      category: 'goal',
      amount: gl.metadata?.amount || 0,
      date: gl.createdAt,
      description: `Goal Allocation: ${gl.metadata?.title || 'Saving Goal'}`,
      metadata: { goalId: gl.metadata?.goalId },
    }));

    let activity = [
      ...formattedInvestments,
      ...formattedProfits,
      ...formattedRepayments,
      ...formattedGoalLogs,
    ];

    // Filter by search if model query didn't catch everything (like profit distribution descriptions)
    if (search) {
      const searchLower = search.toLowerCase();
      activity = activity.filter((a) =>
        a.description.toLowerCase().includes(searchLower),
      );
    }

    // Filter by category
    if (category) {
      activity = activity.filter((a) => a.category === category);
    }

    activity.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Summary (on full filtered activity)
    const summary = activity.reduce(
      (acc, item) => {
        if (
          item.type === 'deposit' ||
          item.type === 'transfer_receive' ||
          item.type === 'external_receive'
        ) {
          acc.totalDeposits += item.amount;
        } else if (
          item.type === 'withdrawal' ||
          item.type === 'transfer_send'
        ) {
          acc.totalWithdrawals += item.amount;
        }
        return acc;
      },
      { totalDeposits: 0, totalWithdrawals: 0 },
    );

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalEntries = activity.length;

    const paginatedActivity = activity.slice(skip, skip + limit);

    res.json({
      data: paginatedActivity,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
      summary,
    });
  } catch (error) {
    console.error('Get Member Activity Error:', error);
    res.status(500).json({ message: 'Failed to fetch activity records' });
  }
};

/**
 * @desc    Transfer funds to another member
 * @route   POST /api/members/portal/transfer
 * @access  Private (Member)
 */
const transferFunds = async (req, res) => {
  const { recipientId, recipientIdentifier, amount, description, accountType = 'current' } = req.body;
  const senderId = req.member._id;

  if (
    (!recipientId && !recipientIdentifier) ||
    !amount ||
    parseFloat(amount) <= 0
  ) {
    return res.status(400).json({ message: 'Invalid recipient or amount' });
  }

  // Per-tier limit check before we start a session — if rejected, surfaces a
  // clear 403 to the client and nothing in the ledger is touched.
  try {
    const { assertWithinLimits } = require('../../services/transferLimits');
    await assertWithinLimits({
      memberId: senderId,
      channel: 'internal_transfer',
      amount: parseFloat(amount),
    });
  } catch (limitErr) {
    if (limitErr.code === 'LIMIT_EXCEEDED') {
      return res
        .status(limitErr.status || 403)
        .json({ message: limitErr.message, code: limitErr.code, details: limitErr.details });
    }
    throw limitErr;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sender = await Member.findById(senderId).session(session);
    if (!sender) throw new Error('Sender not found');
    const tenantOwnerId = sender.user;
    const availableBalance = accountType === 'current' ? sender.currentBalance : sender.savingBalance;
    if (availableBalance < parseFloat(amount)) {
      throw new Error(`Insufficient ${accountType} balance`);
    }

    // Find recipient by ID, email, phone, or account numbers — scoped to the
    // sender's business so a member of tenant A cannot send funds to a member
    // of tenant B (cross-tenant IDOR).
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let recipient;
    if (recipientId) {
      recipient = await Member.findOne({
        _id: recipientId,
        user: tenantOwnerId,
      }).session(session);
    } else {
      const identifier = String(recipientIdentifier || '');
      const exact = escapeRegex(identifier);
      recipient = await Member.findOne({
        user: tenantOwnerId,
        $or: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
          { savingAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
          { currentAccountNumber: { $regex: new RegExp(`^${exact}$`, 'i') } },
        ],
      }).session(session);
    }

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer to yourself');
    }

    const transferAmount = Math.round(parseFloat(amount));

    // Update balances atomically inside session, guarded by a $gte predicate
    // that prevents concurrent overdrafts.
    const senderField = accountType === 'current' ? 'currentBalance' : 'savingBalance';
    const senderInc = accountType === 'current'
      ? { currentBalance: -transferAmount, totalWithdrawn: transferAmount }
      : { savingBalance: -transferAmount, totalSavingWithdrawn: transferAmount };

    const senderRes = await Member.updateOne(
      { _id: sender._id, [senderField]: { $gte: transferAmount } },
      { $inc: senderInc },
      { session },
    );
    if (senderRes.modifiedCount !== 1) {
      throw new Error(`Insufficient ${accountType} balance`);
    }
    // Credit the recipient into the SAME account type the sender debited. Crediting
    // a saving-account debit into the recipient's CURRENT balance silently moved
    // funds across account types and distorted the saving-profit accrual base.
    const recipientInc = accountType === 'current'
      ? { currentBalance: transferAmount, totalInvested: transferAmount }
      : { savingBalance: transferAmount, totalSavingDeposited: transferAmount };
    await Member.updateOne(
      { _id: recipient._id },
      { $inc: recipientInc },
      { session },
    );

    // Refresh objects for subsequent logic if needed (e.g., balanceAfter)
    const updatedSender = await Member.findById(senderId).session(session);
    const updatedRecipient = await Member.findById(recipient._id).session(
      session,
    );

    // Create investment records for both
    const senderTransaction = new Investment({
      user: sender.user,
      member: sender._id,
      branchId: sender.branchId,
      type: 'transfer_send',
      amount: transferAmount,
      accountType,
      balanceAfter: accountType === 'current' ? updatedSender.currentBalance : updatedSender.savingBalance,
      description: description || `Transfer to ${recipient.name}`,
      date: new Date(),
      metadata: {
        transferType: 'internal',
        senderId: sender._id,
        senderName: sender.name,
        recipientId: recipient._id,
        recipientName: recipient.name,
      },
    });

    const recipientTransaction = new Investment({
      user: recipient.user,
      member: recipient._id,
      branchId: recipient.branchId,
      type: 'transfer_receive',
      amount: transferAmount,
      accountType,
      balanceAfter: accountType === 'current' ? updatedRecipient.currentBalance : updatedRecipient.savingBalance,
      description: description || `Transfer from ${sender.name}`,
      date: new Date(),
      metadata: {
        transferType: 'internal',
        senderId: sender._id,
        senderName: sender.name,
        recipientId: recipient._id,
        recipientName: recipient.name,
      },
    });

    await senderTransaction.save({ session });
    await recipientTransaction.save({ session });

    // Internal Activity Log for Sender
    await ActivityLog.create(
      [
        {
          user: sender.user,
          action: 'fund_transfer_sent',
          category: 'member',
          details: `Sent ${transferAmount} to ${recipient.name}`,
          metadata: { recipientId: recipient._id, amount: transferAmount },
          branchId: sender.branchId,
        },
      ],
      { session },
    );

    // Internal Activity Log for Recipient
    await ActivityLog.create(
      [
        {
          user: recipient.user,
          action: 'fund_transfer_received',
          category: 'member',
          details: `Received ${transferAmount} from ${sender.name}`,
          metadata: { senderId: sender._id, amount: transferAmount },
          branchId: recipient.branchId,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // ── Goal round-up auto-contribute ──────────────────────────────────────
    // Fire after the main transfer commits so a roundup failure can't
    // unwind the user's actual transfer. Best-effort: if the member has no
    // roundup-enabled goal or insufficient slack, this silently no-ops.
    try {
      const { applyRoundupOnDebit } = require('../../services/goalAutoContribute');
      await applyRoundupOnDebit({
        memberId: sender._id,
        debitAmount: transferAmount,
      });
    } catch (roundupErr) {
      console.warn('[Transfer] roundup hook failed:', roundupErr.message);
    }

    // ── Notifications (outside transaction for performance) ────────────────
    try {
      // Notify Sender
      await createTransactionNotification({
        recipientId: sender._id,
        title: 'Transfer Sent',
        message: `You sent Rs. ${transferAmount.toLocaleString()} to ${capitalizeName(recipient.name)}.`,
        type: 'info',
        branchId: sender.branchId,
        action: 'fund_transfer_sent',
        metadata: {
          recipientId: recipient._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });

      // Notify Recipient
      await createTransactionNotification({
        recipientId: recipient._id,
        title: 'Transfer Received',
        message: `You received Rs. ${transferAmount.toLocaleString()} from ${capitalizeName(sender.name)}.`,
        type: 'success',
        branchId: recipient.branchId,
        action: 'fund_transfer_received',
        metadata: {
          senderId: sender._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });
    } catch (notifError) {
      console.error('P2P Transfer Notification Error:', notifError);
    }

    // Email Notifications
    try {
      const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, sender.branchId);

      // Email to Sender
      if (sender.email) {
        sendEmailAsync({
          to: sender.email,
          subject: 'Transfer Sent Confirmation',
          html: transactionEmail({
            memberName: sender.name,
            transactionType: 'Transfer Sent',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(sender._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: senderTransaction._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
            recipientName: recipient.name,
          }),
        });
      }

      // Email to Recipient
      if (recipient.email) {
        // Reuse business and branch context defined above
        sendEmailAsync({
          to: recipient.email,
          subject: 'Transfer Received Confirmation',
          html: transactionEmail({
            memberName: recipient.name,
            transactionType: 'Transfer Received',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(recipient._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: recipientTransaction._id
              .toString()
              .slice(-8)
              .toUpperCase(),
            logoUrl: logoUrl,
            senderName: sender.name,
          }),
        });
      }
    } catch (emailError) {
      console.error('Transfer Email Notification Error:', emailError);
    }

    res.status(200).json({
      message: 'Transfer successful',
      balance: sender.currentBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Admin/Staff initiation of fund transfer between members
 * @route   POST /api/members/admin/transfer
 * @access  Private (Admin/Staff)
 */
const adminTransferFunds = async (req, res) => {
  const { senderId, recipientIdentifier, amount, description, accountType = 'current' } = req.body;

  if (!senderId || !recipientIdentifier || !amount || parseFloat(amount) <= 0) {
    return res
      .status(400)
      .json({ message: 'Invalid sender, recipient, or amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Scope both sender and recipient to the calling admin's business.
    const tenantOwnerId = req.user.effectiveOwnerId || req.user._id;
    const sender = await Member.findOne({ _id: senderId, user: tenantOwnerId }).session(session);
    if (!sender) {
      throw new Error('Sender member not found');
    }

    const availableBalance = accountType === 'current' ? sender.currentBalance : sender.savingBalance;
    if (availableBalance < parseFloat(amount)) {
      throw new Error(`Insufficient balance in sender ${accountType} account`);
    }

    // Find recipient by email, phone, or account numbers — scoped to the
    // same business as the admin/sender (prevents cross-tenant IDOR).
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

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient._id.equals(sender._id)) {
      throw new Error('Cannot transfer to the same member');
    }

    const transferAmount = Math.round(parseFloat(amount));

    // Atomic + concurrency-safe balance update: $gte predicate prevents
    // two parallel admin transfers both passing the read-then-decrement check.
    const senderField = accountType === 'current' ? 'currentBalance' : 'savingBalance';
    const senderInc = accountType === 'current'
      ? { currentBalance: -transferAmount, totalWithdrawn: transferAmount }
      : { savingBalance: -transferAmount, totalSavingWithdrawn: transferAmount };

    const senderRes = await Member.updateOne(
      { _id: sender._id, [senderField]: { $gte: transferAmount } },
      { $inc: senderInc },
      { session },
    );
    if (senderRes.modifiedCount !== 1) {
      throw new Error(`Insufficient balance in sender ${accountType} account`);
    }
    await Member.updateOne(
      { _id: recipient._id },
      {
        $inc: { currentBalance: transferAmount, totalInvested: transferAmount },
      },
      { session },
    );

    // Refresh objects for logs/response
    const updatedSender = await Member.findById(senderId).session(session);
    const updatedRecipient = await Member.findById(recipient._id).session(
      session,
    );

    // Create investment records for both
    const senderTransaction = new Investment({
      user: sender.user,
      member: sender._id,
      branchId: sender.branchId,
      type: 'transfer_send',
      amount: transferAmount,
      balanceAfter: accountType === 'current' ? updatedSender.currentBalance : updatedSender.savingBalance,
      description: description || `Admin Transfer to ${recipient.name}`,
      date: new Date(),
    });

    const recipientTransaction = new Investment({
      user: recipient.user,
      member: recipient._id,
      branchId: recipient.branchId,
      type: 'transfer_receive',
      amount: transferAmount,
      balanceAfter: recipient.currentBalance,
      description: description || `Admin Transfer from ${sender.name}`,
      date: new Date(),
    });

    await senderTransaction.save({ session });
    await recipientTransaction.save({ session });

    // Internal Activity Log showing Admin/Staff action
    await ActivityLog.create(
      [
        {
          user: req.user.effectiveOwnerId,
          action: 'admin_fund_transfer_initiated',
          category: 'member',
          details: `${req.user.name} transferred ${transferAmount} from ${sender.name} to ${recipient.name}`,
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

    // ── Automatic Loan Deduction for Recipient ─────────────────────────────
    try {
      const activeLoan = await Loan.findOne({
        customer: recipient.customer,
        status: 'active',
      });

      if (activeLoan) {
        const deductionAmount = Math.min(
          transferAmount,
          activeLoan.remainingAmount,
        );
        if (deductionAmount > 0) {
          // We need a dummy req-like object if we are outside a standard path or just pass req
          await loanRepaymentService.processRepayment(
            activeLoan,
            deductionAmount,
            req,
            {
              notes: `Auto-deduction from received transfer: ${description || 'Admin Transfer'}`,
              isAutoValue: true,
            },
          );
        }
      }
    } catch (autoRepoError) {
      console.error(
        'Auto Repayment Error in adminTransferFunds:',
        autoRepoError,
      );
    }

    // Dashboard Notifications
    try {
      // Notify Sender
      await createTransactionNotification({
        recipientId: sender._id,
        title: 'Transfer Sent (Admin)',
        message: `An admin transferred Rs. ${transferAmount.toLocaleString()} from your account to ${capitalizeName(recipient.name)}.`,
        type: 'info',
        branchId: sender.branchId,
        action: 'admin_fund_transfer_sent',
        metadata: {
          recipientId: recipient._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });

      // Notify Recipient
      await createTransactionNotification({
        recipientId: recipient._id,
        title: 'Transfer Received (Admin)',
        message: `An admin transferred Rs. ${transferAmount.toLocaleString()} to your account from ${capitalizeName(sender.name)}.`,
        type: 'success',
        branchId: recipient.branchId,
        action: 'admin_fund_transfer_received',
        metadata: {
          senderId: sender._id,
          amount: transferAmount,
          link: '/member/transactions',
        },
      });
    } catch (notifError) {
      console.error('Admin Transfer Notification Error:', notifError);
    }

    // Email Notifications
    try {
      // Email to Sender
      if (sender.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, sender.branchId);
        sendEmailAsync({
          to: sender.email,
          subject: 'Transfer Sent Confirmation',
          html: transactionEmail({
            memberName: sender.name,
            transactionType: 'Transfer Sent',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(sender._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: senderTransaction._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
            recipientName: recipient.name,
          }),
        });
      }

      // Email to Recipient
      if (recipient.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, recipient.branchId);
        sendEmailAsync({
          to: recipient.email,
          subject: 'Transfer Received Confirmation',
          html: transactionEmail({
            memberName: recipient.name,
            transactionType: 'Transfer Received',
            amount: transferAmount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: (
              await calculateEffectiveBalance(recipient._id)
            ).toLocaleString(),
            branchName: branchName,
            reference: recipientTransaction._id
              .toString()
              .slice(-8)
              .toUpperCase(),
            senderName: sender.name,
          }),
        });
      }
    } catch (emailError) {
      console.error('Admin Transfer Email Notification Error:', emailError);
    }

    res.status(200).json({
      message: 'Admin transfer successful',
      senderBalance: sender.currentBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

const lookupMember = async (req, res) => {
  const { identifier } = req.query;

  if (!identifier || identifier.length < 3) {
    return res.json([]);
  }

  try {
    const effectiveOwnerId = req.user
      ? req.user.effectiveOwnerId
      : req.member.user;

    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedIdentifier, 'i');

    const orConditions = [
      { name: regex },
      { cnic: regex },
      { phone: regex },
      { email: regex },
      { savingAccountNumber: regex },
      { currentAccountNumber: regex },
    ];

    // Also try digits-only match for account/phone numbers
    const digitsOnly = identifier.replace(/\D/g, '');
    if (digitsOnly.length >= 3) {
      orConditions.push({ cnic: new RegExp(digitsOnly) });
      orConditions.push({ phone: new RegExp(digitsOnly) });
      orConditions.push({ savingAccountNumber: new RegExp(digitsOnly) });
      orConditions.push({ currentAccountNumber: new RegExp(digitsOnly) });
    }

    const members = await Member.find({
      user: effectiveOwnerId,
      $or: orConditions,
    })
      .select(
        'name email phone cnic memberId savingAccountNumber currentAccountNumber profilePicture',
      )
      .limit(6);

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc  Recalculate and fix currentBalance for one or all members from Investment records
 * @route POST /api/members/recalculate-balance        (single: body { memberId })
 * @route POST /api/members/recalculate-balance/all   (all members for owner)
 * @access Private (Admin/Staff)
 */
const recalculateBalance = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { memberId } = req.body;

    const query = memberId ? { _id: memberId, user: userId } : { user: userId };

    const members = await Member.find(query);
    if (!members.length) {
      return res.status(404).json({ message: 'No members found' });
    }

    const results = [];

    for (const member of members) {
      // Sum current-account Investment records only. Saving-account entries
      // belong to savingBalance; Reversed entries never happened.
      const investments = await Investment.find({
        member: member._id,
        accountType: 'current',
        status: { $ne: 'Reversed' },
      });

      let computed = 0;
      for (const inv of investments) {
        if (
          inv.type === 'deposit' ||
          inv.type === 'transfer_receive' ||
          inv.type === 'loan_disbursement' // proceeds credit the wallet too
        ) {
          computed += inv.amount;
        } else if (
          inv.type === 'withdrawal' ||
          inv.type === 'transfer_send'
        ) {
          computed -= inv.amount;
        }
        // 'profit' Investment type intentionally ignored — TD profit is baked
        // into the matching 'deposit' Investment at maturity (amount =
        // principal + profit), and regular profit is captured below via
        // ProfitDistribution.
      }

      // Only 'regular' profit lands in currentBalance. 'share' lives in
      // shareBalance; 'saving' lives in savingBalance; 'term_deposit' is
      // already in the corresponding Investment(deposit) row above.
      const profits = await ProfitDistribution.find({
        member: member._id,
        type: 'regular',
        status: { $ne: 'Failed' },
      });
      const totalProfit = profits.reduce((s, p) => s + p.amount, 0);
      computed += totalProfit;

      const oldBalance = member.currentBalance;
      member.currentBalance = Math.round(computed); // Allow negative — member owes more than invested
      await member.save();

      results.push({
        memberId: member._id,
        name: member.name,
        oldBalance,
        newBalance: member.currentBalance,
        diff: member.currentBalance - oldBalance,
      });
    }

    return res.json({
      message: `Recalculated balance for ${results.length} member(s)`,
      results,
    });
  } catch (error) {
    console.error('Recalculate Balance Error:', error);
    return res.status(500).json({ message: 'Failed to recalculate balance' });
  }
};

module.exports = {
  initiateRaastDeposit,
  getMemberActivity,
  transferFunds,
  adminTransferFunds,
  lookupMember,
  recalculateBalance,
};
