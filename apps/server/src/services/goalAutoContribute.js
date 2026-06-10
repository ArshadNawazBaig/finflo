const mongoose = require('mongoose');
const Member = require('../models/Member');
const SavingGoal = require('../models/SavingGoal');
const Investment = require('../models/Investment');
const { logActivity } = require('../controllers/activityLogController');

/**
 * Goal-linked auto-contribute service. Two entry points:
 *   - applyRoundupOnDebit(): event-hooked from member debit flows (transfer,
 *     bank withdrawal, etc.). Computes the delta between `debitAmount` and the
 *     next multiple of the goal's roundup unit, then sweeps it into the goal.
 *   - runMonthlyAutoContributions(): driven by a daily cron. Picks up any
 *     goal whose `recurring` schedule is due today and hasn't fired this month.
 *
 * Both call into the same `creditGoal()` core so the ledger entries are
 * identical regardless of trigger. Failures here never bubble — a missed
 * round-up should not roll back the user's actual transfer.
 */

const SOURCE_BALANCE_FIELD = {
  current: 'currentBalance',
  saving: 'savingBalance',
};

const SOURCE_WITHDRAW_COUNTER = {
  current: 'totalWithdrawn',
  saving: 'totalSavingWithdrawn',
};

/**
 * Atomic deduct-from-balance + credit-to-goal + Investment ledger entry +
 * activity log. Returns { goal, member } on success or null when the member
 * can't fund the contribution.
 */
const creditGoal = async ({ memberId, goal, amount, sourceAccount, trigger }) => {
  const balanceField = SOURCE_BALANCE_FIELD[sourceAccount] || 'currentBalance';
  const withdrawCounter =
    SOURCE_WITHDRAW_COUNTER[sourceAccount] || 'totalWithdrawn';

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const inc = { [balanceField]: -amount, [withdrawCounter]: amount };
    const updatedMember = await Member.findOneAndUpdate(
      { _id: memberId, [balanceField]: { $gte: amount } },
      { $inc: inc },
      { session, new: true },
    );

    if (!updatedMember) {
      // Not enough balance — skip without throwing so the parent flow
      // (the user's transfer / the cron loop) keeps going.
      await session.abortTransaction();
      session.endSession();
      return null;
    }

    const updatedGoal = await SavingGoal.findOneAndUpdate(
      { _id: goal._id, member: memberId, status: 'active' },
      { $inc: { currentAmount: amount } },
      { session, new: true },
    );

    if (!updatedGoal) {
      // Race: goal got deleted / completed between read and write — roll back.
      await session.abortTransaction();
      session.endSession();
      return null;
    }

    if (
      updatedGoal.currentAmount >= updatedGoal.targetAmount &&
      updatedGoal.status !== 'completed'
    ) {
      updatedGoal.status = 'completed';
      await updatedGoal.save({ session });
    }

    if (updatedMember.autoContribute?.recurring?.enabled && trigger === 'recurring') {
      // bookkeeping handled by caller — noop here
    }

    await Investment.create(
      [
        {
          user: updatedMember.user,
          member: updatedMember._id,
          branchId: updatedMember.branchId,
          type: 'withdrawal',
          accountType: sourceAccount,
          amount,
          balanceAfter: updatedMember[balanceField],
          description: `Auto-contribute (${trigger}) → ${updatedGoal.title}`,
          date: new Date(),
          metadata: {
            autoContribute: true,
            trigger,
            goalId: updatedGoal._id,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Activity log lives outside the transaction (best-effort).
    try {
      await logActivity({
        userId: updatedMember._id,
        action: 'goal_auto_contribute',
        category: 'member',
        details: `Auto-contributed ${amount} to goal: ${updatedGoal.title} (${trigger})`,
        metadata: {
          goalId: updatedGoal._id,
          amount,
          trigger,
          title: updatedGoal.title,
          isMemberAction: true,
        },
      });
    } catch (e) {
      /* swallow — activity log is non-critical */
    }

    return { goal: updatedGoal, member: updatedMember };
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) {}
    session.endSession();
    throw err;
  }
};

/**
 * Hook this after a successful debit (transfer / external withdrawal). It
 * silently no-ops if the member has no roundup-enabled goal, the debit is
 * already a multiple of the unit, or the member can't fund the round-up.
 *
 * Pass `excludeFromTotal: true` if your caller already incremented totals via
 * a different path — currently unused but reserved.
 */
const applyRoundupOnDebit = async ({ memberId, debitAmount }) => {
  try {
    if (!memberId || !debitAmount || debitAmount <= 0) return null;
    const goal = await SavingGoal.findOne({
      member: memberId,
      status: 'active',
      'autoContribute.roundup.enabled': true,
    }).sort({ updatedAt: -1 });
    if (!goal) return null;

    const unit = goal.autoContribute?.roundup?.unit || 10;
    const remainder = debitAmount % unit;
    if (remainder === 0) return null; // exact multiple — nothing to round.
    const delta = unit - remainder;
    if (delta <= 0) return null;

    const sourceAccount =
      goal.autoContribute?.roundup?.sourceAccount || 'current';

    return await creditGoal({
      memberId,
      goal,
      amount: delta,
      sourceAccount,
      trigger: 'roundup',
    });
  } catch (err) {
    console.error('[goalAutoContribute] roundup error:', err.message);
    return null;
  }
};

/**
 * Cron entry — runs once daily; sweeps any recurring auto-contributes whose
 * `dayOfMonth` matches today (and that haven't already fired this month).
 *
 * Returns a summary object suitable for logging.
 */
const runMonthlyAutoContributions = async () => {
  const today = new Date();
  const day = today.getDate();

  // Day-of-month constraint protects us from contributing twice in a single
  // month; the `lastRunAt` guard below protects us within the same day if the
  // job runs more than once.
  const dueGoals = await SavingGoal.find({
    status: 'active',
    'autoContribute.recurring.enabled': true,
    'autoContribute.recurring.dayOfMonth': day,
    'autoContribute.recurring.amount': { $gt: 0 },
  });

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const goal of dueGoals) {
    try {
      const last = goal.autoContribute?.recurring?.lastRunAt
        ? new Date(goal.autoContribute.recurring.lastRunAt)
        : null;
      // Skip if already fired this month.
      if (
        last &&
        last.getFullYear() === today.getFullYear() &&
        last.getMonth() === today.getMonth()
      ) {
        skipped += 1;
        continue;
      }

      const amount = Math.round(goal.autoContribute.recurring.amount || 0);
      if (amount <= 0) {
        skipped += 1;
        continue;
      }

      const sourceAccount =
        goal.autoContribute.recurring.sourceAccount || 'current';

      const result = await creditGoal({
        memberId: goal.member,
        goal,
        amount,
        sourceAccount,
        trigger: 'recurring',
      });

      if (!result) {
        // insufficient balance or race — count as skipped, don't update timestamp
        skipped += 1;
        continue;
      }

      // Mark fired so the same goal can't double-fire this month.
      await SavingGoal.updateOne(
        { _id: goal._id },
        { $set: { 'autoContribute.recurring.lastRunAt': new Date() } },
      );
      success += 1;
    } catch (err) {
      console.error(
        `[goalAutoContribute] recurring failed for goal ${goal._id}:`,
        err.message,
      );
      failed += 1;
    }
  }

  return { success, skipped, failed, total: dueGoals.length };
};

module.exports = {
  creditGoal,
  applyRoundupOnDebit,
  runMonthlyAutoContributions,
};
