const mongoose = require('mongoose');
const TermDeposit = require('../models/TermDeposit');
const Member = require('../models/Member');
const Investment = require('../models/Investment');
const FinancialTransaction = require('../models/FinancialTransaction');
const ProfitDistribution = require('../models/ProfitDistribution');
const { logActivity } = require('./activityLogController');
const { addMonthsSafe } = require('../utils/reportUtils');

/**
 * @desc    Create a new term deposit
 * @route   POST /api/term-deposits
 * @access  Private (Admin)
 */
const createTermDeposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { memberId, principal, duration, sourceAccount = 'current', notes } = req.body;

    if (!memberId || !principal || !duration) {
      return res.status(400).json({ message: 'Member, principal, and duration are required' });
    }

    const member = await Member.findById(memberId).session(session);
    if (!member) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check balance
    const balance = sourceAccount === 'saving' ? member.savingBalance : member.currentBalance;
    if (balance < principal) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient ${sourceAccount} account balance. Available: ${balance}, Required: ${principal}`,
      });
    }

    // Get profit rate from the business owner's config
    const User = require('../models/User');
    const adminUser = await User.findById(req.user.effectiveOwnerId).select(
      'termDepositRates termDepositEarlyBreakPenalty'
    );
    const rateConfig = (adminUser?.termDepositRates || []).find(
      (r) => r.duration === duration,
    );
    const profitRate = rateConfig ? rateConfig.rate : 0; // Default 0%
    const earlyBreakPenalty = adminUser?.termDepositEarlyBreakPenalty || 0;

    // Calculate projected profit (simple interest)
    const projectedProfit = Math.round((principal * profitRate * duration) / (12 * 100));

    // Calculate maturity date. setMonth() alone rolls forward when the
    // target month has fewer days (Jan 31 + 1mo → Mar 2/3); addMonthsSafe
    // clamps to the last day of the target month instead.
    const startDate = new Date();
    const maturityDate = addMonthsSafe(startDate, duration);

    // Deduct from member balance
    const deductFields = sourceAccount === 'saving'
      ? { savingBalance: -principal, totalSavingWithdrawn: principal }
      : { currentBalance: -principal, totalWithdrawn: principal };

    await Member.findByIdAndUpdate(memberId, { $inc: deductFields }, { session });

    // Create term deposit
    const [termDeposit] = await TermDeposit.create(
      [{
        user: req.user.effectiveOwnerId,
        member: memberId,
        branchId: member.branchId,
        principal,
        profitRate,
        duration,
        sourceAccount,
        startDate,
        maturityDate,
        projectedProfit,
        earlyBreakPenaltyRate: earlyBreakPenalty,
        notes,
      }],
      { session },
    );

    // Record investment ledger entry
    const updatedMember = await Member.findById(memberId).session(session);
    await Investment.create(
      [{
        user: req.user.effectiveOwnerId,
        member: memberId,
        branchId: member.branchId,
        type: 'withdrawal',
        accountType: sourceAccount,
        amount: principal,
        balanceAfter: sourceAccount === 'saving' ? updatedMember.savingBalance : updatedMember.currentBalance,
        description: `Term Deposit ${termDeposit.depositNumber} — Locked for ${duration} months at ${profitRate}%`,
        date: startDate,
      }],
      { session },
    );

    // Record financial transaction
    await FinancialTransaction.create(
      [{
        user: req.user.effectiveOwnerId,
        branchId: member.branchId,
        type: 'income',
        category: 'term_deposit',
        amount: principal,
        date: startDate,
        description: `Term Deposit ${termDeposit.depositNumber} — ${member.name} locked ${principal} for ${duration} months`,
        member: memberId,
        referenceId: termDeposit._id,
        referenceModel: 'TermDeposit',
        paymentMethod: 'online',
      }],
      { session },
    );

    await session.commitTransaction();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'term_deposit_created',
      category: 'member',
      details: `Term Deposit ${termDeposit.depositNumber} created for ${member.name} — ${principal} locked for ${duration} months at ${profitRate}%`,
      metadata: { termDepositId: termDeposit._id, memberId, principal, duration },
      req,
    });

    res.status(201).json(termDeposit);
  } catch (error) {
    await session.abortTransaction();
    console.error('Create Term Deposit Error:', error);
    res.status(500).json({ message: error.message || 'Failed to create term deposit' });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get term deposits for a member
 * @route   GET /api/term-deposits/:memberId
 * @access  Private
 */
const getTermDeposits = async (req, res) => {
  try {
    // Ownership check: verify member belongs to this business
    const member = await Member.findById(req.params.memberId);
    if (!member || member.user.toString() !== req.user.effectiveOwnerId.toString()) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const deposits = await TermDeposit.find({ member: req.params.memberId })
      .sort({ createdAt: -1 });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Break a term deposit early (with penalty)
 * @route   POST /api/term-deposits/:id/break
 * @access  Private (Admin)
 */
const breakTermDeposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deposit = await TermDeposit.findById(req.params.id).session(session);
    if (!deposit || deposit.user.toString() !== req.user.effectiveOwnerId.toString()) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Term deposit not found' });
    }

    if (deposit.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Only active deposits can be broken' });
    }

    // Calculate pro-rated profit with penalty
    const now = new Date();
    const msElapsed = now - new Date(deposit.startDate);
    // Cap elapsed months at the deposit duration so a break-at-or-after-maturity
    // cannot accidentally pay out more than the projected (matured) profit.
    const rawMonthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 30);
    const monthsElapsed = Math.max(0, Math.min(deposit.duration, rawMonthsElapsed));
    const fullProfit = Math.min(
      deposit.projectedProfit,
      Math.round(
        (deposit.principal * deposit.profitRate * monthsElapsed) / (12 * 100),
      ),
    );
    const penaltyRate = deposit.earlyBreakPenaltyRate / 100;
    const actualProfit = Math.max(0, Math.round(fullProfit * (1 - penaltyRate)));
    const totalReturn = deposit.principal + actualProfit;

    const creditFields = deposit.sourceAccount === 'saving'
      ? { savingBalance: totalReturn, totalSavingDeposited: deposit.principal, totalSavingProfit: actualProfit }
      : { currentBalance: totalReturn, totalInvested: deposit.principal, totalProfit: actualProfit };

    await Member.findByIdAndUpdate(deposit.member, { $inc: creditFields }, { session });

    deposit.status = 'broken';
    deposit.brokenAt = now;
    deposit.actualProfit = actualProfit;
    await deposit.save({ session });

    // Record profit distribution so Balance Sheet equity tracks this payout
    if (actualProfit > 0) {
      await ProfitDistribution.create(
        [{
          user: deposit.user,
          member: deposit.member,
          branchId: deposit.branchId,
          amount: actualProfit,
          type: 'term_deposit',
          period: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          calculationMethod: `Term Deposit ${deposit.depositNumber} broken early — ${deposit.earlyBreakPenaltyRate}% penalty applied`,
          date: now,
        }],
        { session },
      );
    }

    // Record investment
    const updatedMember = await Member.findById(deposit.member).session(session);
    await Investment.create(
      [{
        user: deposit.user,
        member: deposit.member,
        branchId: deposit.branchId,
        type: 'deposit',
        accountType: deposit.sourceAccount,
        amount: totalReturn,
        balanceAfter: deposit.sourceAccount === 'saving' ? updatedMember.savingBalance : updatedMember.currentBalance,
        description: `Term Deposit ${deposit.depositNumber} broken early — Principal: ${deposit.principal}, Profit: ${actualProfit} (${deposit.earlyBreakPenaltyRate}% penalty applied)`,
        date: now,
      }],
      { session },
    );

    await session.commitTransaction();

    await logActivity({
      userId: req.user._id,
      action: 'term_deposit_broken',
      category: 'member',
      details: `Term Deposit ${deposit.depositNumber} broken early. Returned ${totalReturn} (${deposit.earlyBreakPenaltyRate}% penalty on profit)`,
      metadata: { termDepositId: deposit._id, totalReturn, actualProfit },
      req,
    });

    res.json({ message: 'Term deposit broken successfully', deposit, totalReturn, actualProfit });
  } catch (error) {
    await session.abortTransaction();
    console.error('Break Term Deposit Error:', error);
    res.status(500).json({ message: error.message || 'Failed to break term deposit' });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Mature a term deposit (full profit)
 * @route   POST /api/term-deposits/:id/mature
 * @access  Private (Admin)
 */
const matureTermDeposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deposit = await TermDeposit.findById(req.params.id).session(session);
    if (!deposit || deposit.user.toString() !== req.user.effectiveOwnerId.toString()) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Term deposit not found' });
    }

    if (deposit.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Only active deposits can be matured' });
    }

    const totalReturn = deposit.principal + deposit.projectedProfit;

    // Credit back to member
    const creditFields = deposit.sourceAccount === 'saving'
      ? { savingBalance: totalReturn, totalSavingDeposited: deposit.principal, totalSavingProfit: deposit.projectedProfit }
      : { currentBalance: totalReturn, totalInvested: deposit.principal, totalProfit: deposit.projectedProfit };

    await Member.findByIdAndUpdate(deposit.member, { $inc: creditFields }, { session });

    deposit.status = 'matured';
    deposit.maturedAt = new Date();
    deposit.actualProfit = deposit.projectedProfit;
    await deposit.save({ session });

    // Record profit distribution so Balance Sheet equity tracks this payout
    if (deposit.projectedProfit > 0) {
      await ProfitDistribution.create(
        [{
          user: deposit.user,
          member: deposit.member,
          branchId: deposit.branchId,
          amount: deposit.projectedProfit,
          type: 'term_deposit',
          period: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          calculationMethod: `Term Deposit ${deposit.depositNumber} matured — ${deposit.principal} × ${deposit.profitRate}% × ${deposit.duration} months`,
          date: new Date(),
        }],
        { session },
      );
    }

    // Record investment
    const updatedMember = await Member.findById(deposit.member).session(session);
    await Investment.create(
      [{
        user: deposit.user,
        member: deposit.member,
        branchId: deposit.branchId,
        type: 'deposit',
        accountType: deposit.sourceAccount,
        amount: totalReturn,
        balanceAfter: deposit.sourceAccount === 'saving' ? updatedMember.savingBalance : updatedMember.currentBalance,
        description: `Term Deposit ${deposit.depositNumber} matured — Principal: ${deposit.principal} + Profit: ${deposit.projectedProfit}`,
        date: new Date(),
      }],
      { session },
    );

    await session.commitTransaction();

    // Notify member
    try {
      const { createTransactionNotification } = require('../utils/notificationHelper');
      await createTransactionNotification({
        recipientId: deposit.member,
        title: 'Term Deposit Matured',
        message: `Your term deposit ${deposit.depositNumber} has matured! ${deposit.principal.toLocaleString()} + ${deposit.projectedProfit.toLocaleString()} profit has been credited to your ${deposit.sourceAccount} account.`,
        type: 'success',
        branchId: deposit.branchId,
        action: 'term_deposit_matured',
      });
    } catch (e) {
      console.error('TD maturity notification error:', e);
    }

    await logActivity({
      userId: req.user._id,
      action: 'term_deposit_matured',
      category: 'member',
      details: `Term Deposit ${deposit.depositNumber} matured. Credited ${totalReturn} (Principal: ${deposit.principal} + Profit: ${deposit.projectedProfit})`,
      metadata: { termDepositId: deposit._id, totalReturn },
      req,
    });

    res.json({ message: 'Term deposit matured successfully', deposit, totalReturn });
  } catch (error) {
    await session.abortTransaction();
    console.error('Mature Term Deposit Error:', error);
    res.status(500).json({ message: error.message || 'Failed to mature term deposit' });
  } finally {
    session.endSession();
  }
};

const getPortalTermDeposits = async (req, res) => {
  try {
    const deposits = await TermDeposit.find({ member: req.member._id })
      .sort({ createdAt: -1 });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Member self-creates a term deposit from the portal
 * @route   POST /api/term-deposits/portal/create
 * @access  Private (Member)
 */
const createPortalTermDeposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { principal, duration, sourceAccount = 'current' } = req.body;
    const memberId = req.member._id;
    const ownerId = req.member.user; // business owner

    if (!principal || !duration) {
      return res.status(400).json({ message: 'Principal and duration are required' });
    }

    if (principal <= 0) {
      return res.status(400).json({ message: 'Principal must be greater than zero' });
    }

    const member = await Member.findById(memberId).session(session);
    if (!member) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Member not found' });
    }

    // Check balance
    const balance = sourceAccount === 'saving' ? member.savingBalance : member.currentBalance;
    if (balance < principal) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient ${sourceAccount} account balance. Available: ${balance}, Required: ${principal}`,
      });
    }

    // Get profit rate from business owner's config
    const User = require('../models/User');
    const adminUser = await User.findById(ownerId).select(
      'termDepositRates termDepositEarlyBreakPenalty'
    );
    const rateConfig = (adminUser?.termDepositRates || []).find(
      (r) => r.duration === duration,
    );

    if (!rateConfig) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid term duration. This package is not available.' });
    }

    const profitRate = rateConfig.rate;
    const earlyBreakPenalty = adminUser?.termDepositEarlyBreakPenalty || 0;

    // Calculate projected profit (simple interest)
    const projectedProfit = Math.round((principal * profitRate * duration) / (12 * 100));

    // Calculate maturity date. setMonth() alone rolls forward when the
    // target month has fewer days (Jan 31 + 1mo → Mar 2/3); addMonthsSafe
    // clamps to the last day of the target month instead.
    const startDate = new Date();
    const maturityDate = addMonthsSafe(startDate, duration);

    // Deduct from member balance
    const deductFields = sourceAccount === 'saving'
      ? { savingBalance: -principal, totalSavingWithdrawn: principal }
      : { currentBalance: -principal, totalWithdrawn: principal };

    await Member.findByIdAndUpdate(memberId, { $inc: deductFields }, { session });

    // Create term deposit
    const [termDeposit] = await TermDeposit.create(
      [{
        user: ownerId,
        member: memberId,
        branchId: member.branchId,
        principal,
        profitRate,
        duration,
        sourceAccount,
        startDate,
        maturityDate,
        projectedProfit,
        earlyBreakPenaltyRate: earlyBreakPenalty,
        notes: 'Self-created via Member Portal',
      }],
      { session },
    );

    // Record investment ledger entry
    const updatedMember = await Member.findById(memberId).session(session);
    await Investment.create(
      [{
        user: ownerId,
        member: memberId,
        branchId: member.branchId,
        type: 'withdrawal',
        accountType: sourceAccount,
        amount: principal,
        balanceAfter: sourceAccount === 'saving' ? updatedMember.savingBalance : updatedMember.currentBalance,
        description: `Term Deposit ${termDeposit.depositNumber} — Locked for ${duration} months at ${profitRate}%`,
        date: startDate,
      }],
      { session },
    );

    // Record financial transaction
    await FinancialTransaction.create(
      [{
        user: ownerId,
        branchId: member.branchId,
        type: 'income',
        category: 'term_deposit',
        amount: principal,
        date: startDate,
        description: `Term Deposit ${termDeposit.depositNumber} — ${member.name} locked ${principal} for ${duration} months (Self-Service)`,
        member: memberId,
        referenceId: termDeposit._id,
        referenceModel: 'TermDeposit',
        paymentMethod: 'online',
      }],
      { session },
    );

    await session.commitTransaction();

    // Log activity (fire-and-forget, no session needed)
    logActivity({
      userId: ownerId,
      action: 'term_deposit_created',
      category: 'member',
      details: `Term Deposit ${termDeposit.depositNumber} self-created by ${member.name} — ${principal} locked for ${duration} months at ${profitRate}%`,
      metadata: { termDepositId: termDeposit._id, memberId: memberId.toString(), principal, duration, selfService: true },
      req,
    }).catch(() => {});

    res.status(201).json(termDeposit);
  } catch (error) {
    await session.abortTransaction();
    console.error('Portal Create Term Deposit Error:', error);
    res.status(500).json({ message: error.message || 'Failed to create term deposit' });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Member self-breaks a term deposit early from portal
 * @route   POST /api/term-deposits/portal/:id/break
 * @access  Private (Member)
 */
const breakPortalTermDeposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deposit = await TermDeposit.findById(req.params.id).session(session);
    if (!deposit || deposit.member.toString() !== req.member._id.toString()) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Term deposit not found' });
    }

    if (deposit.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Only active deposits can be broken' });
    }

    // Calculate pro-rated profit with penalty
    const now = new Date();
    const msElapsed = now - new Date(deposit.startDate);
    // Cap elapsed months at the deposit duration so a break-at-or-after-maturity
    // cannot accidentally pay out more than the projected (matured) profit.
    const rawMonthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 30);
    const monthsElapsed = Math.max(0, Math.min(deposit.duration, rawMonthsElapsed));
    const fullProfit = Math.min(
      deposit.projectedProfit,
      Math.round(
        (deposit.principal * deposit.profitRate * monthsElapsed) / (12 * 100),
      ),
    );
    const penaltyRate = deposit.earlyBreakPenaltyRate / 100;
    const actualProfit = Math.max(0, Math.round(fullProfit * (1 - penaltyRate)));
    const totalReturn = deposit.principal + actualProfit;

    const creditFields = deposit.sourceAccount === 'saving'
      ? { savingBalance: totalReturn, totalSavingDeposited: deposit.principal, totalSavingProfit: actualProfit }
      : { currentBalance: totalReturn, totalInvested: deposit.principal, totalProfit: actualProfit };

    await Member.findByIdAndUpdate(deposit.member, { $inc: creditFields }, { session });

    deposit.status = 'broken';
    deposit.brokenAt = now;
    deposit.actualProfit = actualProfit;
    await deposit.save({ session });

    // Record profit distribution so Balance Sheet equity tracks this payout
    if (actualProfit > 0) {
      await ProfitDistribution.create(
        [{
          user: deposit.user,
          member: deposit.member,
          branchId: deposit.branchId,
          amount: actualProfit,
          type: 'term_deposit',
          period: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          calculationMethod: `Term Deposit ${deposit.depositNumber} broken early (Self-Service) — ${deposit.earlyBreakPenaltyRate}% penalty applied`,
          date: now,
        }],
        { session },
      );
    }

    // Record investment ledger
    const updatedMember = await Member.findById(deposit.member).session(session);
    await Investment.create(
      [{
        user: deposit.user,
        member: deposit.member,
        branchId: deposit.branchId,
        type: 'deposit',
        accountType: deposit.sourceAccount,
        amount: totalReturn,
        balanceAfter: deposit.sourceAccount === 'saving' ? updatedMember.savingBalance : updatedMember.currentBalance,
        description: `Term Deposit ${deposit.depositNumber} broken early (Self-Service) — Principal: ${deposit.principal}, Profit: ${actualProfit} (${deposit.earlyBreakPenaltyRate}% penalty applied)`,
        date: now,
      }],
      { session },
    );

    await session.commitTransaction();

    // Log activity
    const member = await Member.findById(deposit.member);
    logActivity({
      userId: deposit.user,
      action: 'term_deposit_broken',
      category: 'member',
      details: `Term Deposit ${deposit.depositNumber} broken early by ${member?.name || 'member'} (Self-Service). Returned ${totalReturn} (${deposit.earlyBreakPenaltyRate}% penalty)`,
      metadata: { termDepositId: deposit._id, totalReturn, actualProfit, selfService: true },
      req,
    }).catch(() => {});

    res.json({ message: 'Term deposit broken successfully', deposit, totalReturn, actualProfit });
  } catch (error) {
    await session.abortTransaction();
    console.error('Portal Break Term Deposit Error:', error);
    res.status(500).json({ message: error.message || 'Failed to break term deposit' });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createTermDeposit,
  getTermDeposits,
  breakTermDeposit,
  matureTermDeposit,
  getPortalTermDeposits,
  createPortalTermDeposit,
  breakPortalTermDeposit,
};

