const cron = require('node-cron');
const mongoose = require('mongoose');
const Loan = require('../../models/Loan');
const Customer = require('../../models/Customer');
const Repayment = require('../../models/Repayment');
const Notification = require('../../models/Notification');
const SystemSettings = require('../../models/SystemSettings');
const FinancialTransaction = require('../../models/FinancialTransaction');
const { generateAmortizationSchedule } = require('../../utils/amortizationUtils');
const {
  createTransactionNotification,
} = require('../../utils/notificationHelper');
const { wrap } = require('../jobHealth');
const logger = require('../../utils/logger');

// ─── Fallback Constants (used only if config fails) ─────────────────────────
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const DEFAULT_LATE_FEE_CAP_PCT = 0.2; // never exceed 20% of remaining balance
// ─── Job 9: Recurring Scheduled Payments ─────────────────────────────────────
/**
 * Runs daily at 06:00.
 * Processes active scheduled payments (monthly) where nextExecutionDate <= today.
 * Supports saving_deposit (current→saving transfer) and loan_repayment types.
 */
const runScheduledPayments = async () => {
  console.log('[CRON] runScheduledPayments: starting...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const ScheduledPayment = require('../../models/ScheduledPayment');
    const Member = require('../../models/Member');
    const Investment = require('../../models/Investment');
    const { processRepayment } = require('../loanRepaymentService');

    // Only the _ids; each payment is re-read + guarded inside its own
    // transaction so a concurrent runner (2nd replica) or a crash-retry can't
    // double-execute it.
    const duePayments = await ScheduledPayment.find({
      status: 'active',
      nextExecutionDate: { $lte: today },
    }).select('_id');

    let executed = 0;
    let failed = 0;

    for (const { _id } of duePayments) {
      const session = await mongoose.startSession();
      // Carried out of the transaction so notifications + the terminal
      // 'failed' write happen OUTSIDE it (no extra I/O inside a txn).
      let outcome = 'skipped'; // 'executed' | 'failed' | 'skipped'
      let failureReason = null;
      let notify = null; // { recipientId, branchId, amount, type } once member known
      let notifyOnFail = false; // only the insufficient-funds path notifies (legacy parity)

      try {
        await session.withTransaction(async () => {
          // ── Atomic claim ──
          // Re-read with the same due-guard inside the txn. Advancing the
          // schedule below writes this same doc, so two concurrent runners
          // conflict — one commits, the other aborts & retries, then this
          // guard returns null and it skips. A crash before commit applies
          // nothing, so the next run reprocesses cleanly. No double money.
          const payment = await ScheduledPayment.findOne({
            _id,
            status: 'active',
            nextExecutionDate: { $lte: today },
          }).session(session);
          if (!payment) {
            outcome = 'skipped'; // already processed by another runner / retry
            return;
          }

          const member = await Member.findById(payment.member)
            .select('name user branchId')
            .session(session);
          if (!member) {
            failureReason = 'Member not found';
            outcome = 'failed';
            return;
          }
          notify = {
            recipientId: member._id,
            branchId: member.branchId,
            amount: payment.amount,
            type: payment.type,
          };

          // ── Money movement ──
          if (payment.type === 'saving_deposit') {
            // Atomic, guarded balance move (replaces the read-modify-write
            // `member.save()`, which could lose a concurrent balance update).
            // current → saving transfer when sourced from current; otherwise
            // the legacy saving-sourced top-up, guarded on savingBalance.
            const fromCurrent = payment.sourceAccount === 'current';
            const balanceFilter = fromCurrent
              ? { _id: member._id, currentBalance: { $gte: payment.amount } }
              : { _id: member._id, savingBalance: { $gte: payment.amount } };
            const balanceUpdate = fromCurrent
              ? {
                  $inc: {
                    currentBalance: -payment.amount,
                    savingBalance: payment.amount,
                    totalSavingDeposited: payment.amount,
                  },
                }
              : {
                  $inc: {
                    savingBalance: payment.amount,
                    totalSavingDeposited: payment.amount,
                  },
                };
            const updated = await Member.findOneAndUpdate(
              balanceFilter,
              balanceUpdate,
              { new: true, session },
            );
            if (!updated) {
              failureReason = `Insufficient ${payment.sourceAccount} balance (needed ${payment.amount})`;
              outcome = 'failed';
              notifyOnFail = true;
              return;
            }

            await Investment.create(
              [
                {
                  user: member.user,
                  member: member._id,
                  branchId: member.branchId,
                  type: 'deposit',
                  accountType: 'saving',
                  amount: payment.amount,
                  description: 'Auto: Scheduled monthly saving deposit',
                  balanceAfter: updated.savingBalance,
                },
              ],
              { session },
            );

            await FinancialTransaction.create(
              [
                {
                  user: member.user,
                  branchId: member.branchId,
                  type: 'credit',
                  category: 'saving_deposit',
                  amount: payment.amount,
                  date: new Date(),
                  description: `Auto: Scheduled saving deposit for ${member.name}`,
                  member: member._id,
                  paymentMethod: 'online',
                },
              ],
              { session },
            );
          } else if (payment.type === 'loan_repayment' && payment.loanId) {
            // Delegate to the shared loan repayment service (proper
            // interest/principal split, ledger, trust rating) — pass the
            // session so its writes commit/rollback atomically with the claim.
            const loan = await Loan.findById(payment.loanId)
              .populate('customer')
              .session(session);
            if (!loan || loan.status === 'completed') {
              await ScheduledPayment.updateOne(
                { _id: payment._id },
                {
                  $set: {
                    status: 'completed',
                    failureReason: loan
                      ? 'Loan already completed'
                      : 'Loan not found',
                  },
                },
                { session },
              );
              outcome = 'skipped'; // terminal, not counted (legacy parity)
              return;
            }
            if (payment.sourceAccount && payment.sourceAccount !== 'current') {
              failureReason =
                'Scheduled loan repayments can only be debited from the current account';
              outcome = 'failed';
              return;
            }

            const repaymentAmount = Math.min(payment.amount, loan.remainingAmount);
            const ctx = {
              user: {
                _id: member.user,
                effectiveOwnerId: member.user,
                branchId: member.branchId,
              },
            };
            await processRepayment(loan, repaymentAmount, ctx, {
              session,
              date: new Date(),
              notes: 'Automated scheduled loan repayment',
              isAutoValue: true,
              deductFromWallet: true,
              paymentMethod: 'online',
            });
          }

          // ── Advance the schedule — same txn, so it commits atomically with
          // the money movement (and is the write that arms the concurrency
          // conflict / crash-safety described above). ──
          const reachedMax =
            payment.maxExecutions &&
            payment.executionCount + 1 >= payment.maxExecutions;
          const nextDate = new Date(payment.nextExecutionDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          await ScheduledPayment.updateOne(
            { _id: payment._id },
            {
              $set: {
                lastExecutedAt: new Date(),
                nextExecutionDate: reachedMax
                  ? payment.nextExecutionDate
                  : nextDate,
                status: reachedMax ? 'completed' : 'active',
                failureReason: undefined,
              },
              $inc: { executionCount: 1 },
            },
            { session },
          );

          outcome = 'executed';
        });
      } catch (paymentErr) {
        console.error(
          `[CRON] Error processing scheduled payment ${_id}:`,
          paymentErr.message,
        );
        outcome = 'failed';
        failureReason = paymentErr.message;
      } finally {
        await session.endSession();
      }

      // ── Post-transaction side effects (outside the txn) ──
      if (outcome === 'failed') {
        failed++;
        // Mark terminal failed (money, if any, was already rolled back).
        await ScheduledPayment.updateOne(
          { _id },
          { $set: { status: 'failed', failureReason } },
        ).catch((e) =>
          console.error('[CRON] Failed to mark scheduled payment failed:', e.message),
        );
        if (notifyOnFail && notify) {
          try {
            await createTransactionNotification({
              recipientId: notify.recipientId,
              title: '❌ Scheduled Payment Failed',
              message: `Your scheduled ${notify.type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'} of Rs. ${notify.amount.toLocaleString()} failed due to insufficient funds.`,
              type: 'error',
              branchId: notify.branchId,
              action: 'scheduled_payment_failed',
              metadata: { scheduledPaymentId: _id },
            });
          } catch (notifErr) {
            console.error('[CRON] Scheduled payment notification error:', notifErr.message);
          }
        }
      } else if (outcome === 'executed') {
        executed++;
        try {
          await createTransactionNotification({
            recipientId: notify.recipientId,
            title: '✅ Scheduled Payment Processed',
            message: `Your monthly ${notify.type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'} of Rs. ${notify.amount.toLocaleString()} has been processed successfully.`,
            type: 'success',
            branchId: notify.branchId,
            action: 'scheduled_payment_success',
            metadata: { scheduledPaymentId: _id },
          });
        } catch (notifErr) {
          console.error('[CRON] Scheduled payment notification error:', notifErr.message);
        }
      }
    }

    console.log(
      `[CRON] runScheduledPayments: ${executed} executed, ${failed} failed.`,
    );
  } catch (err) {
    console.error('[CRON] runScheduledPayments ERROR:', err);
  }
};

// ─── Job 10: Term Deposit Auto-Maturity ──────────────────────────────────────
/**
 * Runs daily at 04:00.
 * Auto-matures any active term deposit whose maturityDate has been reached.
 * Credits principal + projectedProfit to the member's source account,
 * records the ProfitDistribution and Investment ledger entries, and emits
 * a notification. Previously this required a manual admin action and
 * deposits could sit "active" past maturity, hiding profit liabilities
 * off the books indefinitely.
 */
const runTermDepositAutoMaturity = async () => {
  console.log('[CRON] runTermDepositAutoMaturity: starting...');
  const now = new Date();

  try {
    const TermDeposit = require('../../models/TermDeposit');
    const Member = require('../../models/Member');
    const Investment = require('../../models/Investment');
    const ProfitDistribution = require('../../models/ProfitDistribution');

    const dueDeposits = await TermDeposit.find({
      status: 'active',
      maturityDate: { $lte: now },
    });

    let matured = 0;
    let rolledOver = 0;

    const User = require('../../models/User');
    const { addMonthsSafe } = require('../../utils/reportUtils');

    for (const deposit of dueDeposits) {
      try {
        // ── Auto-rollover path ──────────────────────────────────────────────
        // Mature the original (status flip + actualProfit) but DO NOT credit
        // the member's account — instead spin up a new active deposit for
        // (principal + earned profit) at the prevailing rate.
        if (deposit.autoRollover) {
          const tdLock = await TermDeposit.findOneAndUpdate(
            { _id: deposit._id, status: 'active' },
            {
              $set: {
                status: 'matured',
                maturedAt: now,
                actualProfit: deposit.projectedProfit,
              },
            },
            { new: true },
          );
          if (!tdLock) continue;

          // Prevailing rate from the tenant's current rate table — falls back
          // to the original deposit's rate if the duration is no longer offered.
          const adminUser = await User.findById(deposit.user).select(
            'termDepositRates termDepositEarlyBreakPenalty',
          );
          const rateConfig = (adminUser?.termDepositRates || []).find(
            (r) => r.duration === deposit.duration,
          );
          const newRate = rateConfig ? rateConfig.rate : deposit.profitRate;
          const newPenalty = adminUser?.termDepositEarlyBreakPenalty ?? deposit.earlyBreakPenaltyRate;

          const newPrincipal = deposit.principal + deposit.projectedProfit;
          const newProjected = Math.round(
            (newPrincipal * newRate * deposit.duration) / (12 * 100),
          );
          const newStart = now;
          const newMaturity = addMonthsSafe(newStart, deposit.duration);

          const newDeposit = await TermDeposit.create({
            user: deposit.user,
            member: deposit.member,
            branchId: deposit.branchId,
            principal: newPrincipal,
            profitRate: newRate,
            duration: deposit.duration,
            sourceAccount: deposit.sourceAccount,
            startDate: newStart,
            maturityDate: newMaturity,
            projectedProfit: newProjected,
            earlyBreakPenaltyRate: newPenalty,
            autoRollover: true,
            rolledOverFrom: deposit._id,
            rolloverCount: (deposit.rolloverCount || 0) + 1,
            notes: `Auto-rolled over from ${deposit.depositNumber}`,
          });

          // Book the earned profit even though it isn't paid out — equity
          // still moves and the member's totalProfit should reflect it.
          if (deposit.projectedProfit > 0) {
            await ProfitDistribution.create({
              user: deposit.user,
              member: deposit.member,
              branchId: deposit.branchId,
              amount: deposit.projectedProfit,
              type: 'term_deposit',
              period: now.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              }),
              calculationMethod: `Auto-rollover ${deposit.depositNumber} → ${newDeposit.depositNumber}`,
              date: now,
            });
          }

          // Cosmetic balance tracking on the member: totalSavingProfit / totalProfit
          // accumulate the earned profit; currentBalance/savingBalance unchanged.
          const trackingFields =
            deposit.sourceAccount === 'saving'
              ? { totalSavingProfit: deposit.projectedProfit }
              : { totalProfit: deposit.projectedProfit };
          if (deposit.projectedProfit > 0) {
            await Member.findByIdAndUpdate(deposit.member, { $inc: trackingFields });
          }

          await TermDeposit.findByIdAndUpdate(deposit._id, {
            $set: { rolledOverTo: newDeposit._id },
          });

          rolledOver++;

          try {
            await createTransactionNotification({
              recipientId: deposit.member,
              title: '🔁 Term Deposit Rolled Over',
              message: `Your term deposit ${deposit.depositNumber} matured and has been auto-rolled into ${newDeposit.depositNumber} (Rs. ${newPrincipal.toLocaleString()} @ ${newRate}% for ${deposit.duration} months).`,
              type: 'success',
              branchId: deposit.branchId,
              action: 'term_deposit_rolled_over',
            });
          } catch (notifErr) {
            console.error('[CRON] TD rollover notification error:', notifErr.message);
          }
          continue;
        }

        // ── Standard maturity path ─────────────────────────────────────────
        const totalReturn = deposit.principal + deposit.projectedProfit;

        const creditFields =
          deposit.sourceAccount === 'saving'
            ? {
                savingBalance: totalReturn,
                totalSavingDeposited: deposit.principal,
                totalSavingProfit: deposit.projectedProfit,
              }
            : {
                currentBalance: totalReturn,
                totalInvested: deposit.principal,
                totalProfit: deposit.projectedProfit,
              };

        // Atomic guard on status so two cron runs can't double-credit.
        const tdUpdate = await TermDeposit.findOneAndUpdate(
          { _id: deposit._id, status: 'active' },
          {
            $set: {
              status: 'matured',
              maturedAt: now,
              actualProfit: deposit.projectedProfit,
            },
          },
          { new: true },
        );
        if (!tdUpdate) continue; // another run already matured it

        const updatedMember = await Member.findByIdAndUpdate(
          deposit.member,
          { $inc: creditFields },
          { new: true },
        );

        if (deposit.projectedProfit > 0) {
          await ProfitDistribution.create({
            user: deposit.user,
            member: deposit.member,
            branchId: deposit.branchId,
            amount: deposit.projectedProfit,
            type: 'term_deposit',
            period: now.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            }),
            calculationMethod: `Auto-matured Term Deposit ${deposit.depositNumber} — ${deposit.principal} × ${deposit.profitRate}% × ${deposit.duration} months`,
            date: now,
          });
        }

        await Investment.create({
          user: deposit.user,
          member: deposit.member,
          branchId: deposit.branchId,
          type: 'deposit',
          accountType: deposit.sourceAccount,
          amount: totalReturn,
          balanceAfter:
            deposit.sourceAccount === 'saving'
              ? updatedMember?.savingBalance
              : updatedMember?.currentBalance,
          description: `Auto-matured Term Deposit ${deposit.depositNumber} — Principal: ${deposit.principal} + Profit: ${deposit.projectedProfit}`,
          date: now,
        });

        matured++;

        try {
          await createTransactionNotification({
            recipientId: deposit.member,
            title: '🎉 Term Deposit Matured',
            message: `Your term deposit ${deposit.depositNumber} has matured. Rs. ${totalReturn.toLocaleString()} (principal Rs. ${deposit.principal.toLocaleString()} + profit Rs. ${deposit.projectedProfit.toLocaleString()}) has been credited to your ${deposit.sourceAccount} account.`,
            type: 'success',
            branchId: deposit.branchId,
            action: 'term_deposit_matured',
          });
        } catch (notifErr) {
          console.error('[CRON] TD maturity notification error:', notifErr.message);
        }
      } catch (depErr) {
        console.error(
          `[CRON] Error auto-maturing deposit ${deposit._id}:`,
          depErr.message,
        );
      }
    }

    console.log(
      `[CRON] runTermDepositAutoMaturity: matured ${matured}, rolled-over ${rolledOver} deposit(s).`,
    );
  } catch (err) {
    console.error('[CRON] runTermDepositAutoMaturity ERROR:', err);
  }
};

// ─── Job 15: Manual Subscription Expiry ──────────────────────────────────────
/**
 * Runs daily at 00:15.
 * Downgrades businesses whose super-admin-granted (manual, non-Stripe) paid
 * subscription has lapsed — `nextBillingDate` is in the past — back to the Free
 * plan and marks the subscription canceled. Stripe-managed subscriptions (those
 * carrying a `stripeSubscriptionId`) are left untouched; their lifecycle is
 * driven by Stripe webhooks, not this date. A paid plan granted without a
 * duration has no `nextBillingDate` and so never auto-expires.
 */
const runSubscriptionExpiry = async () => {
  console.log('[CRON] runSubscriptionExpiry: starting...');
  const now = new Date();

  try {
    const User = require('../../models/User');
    const Notification = require('../../models/Notification');
    const { logActivity } = require('../../controllers/activityLogController');

    // Only manual (non-Stripe) paid subscriptions with a lapsed expiry.
    const manualGuard = {
      $or: [
        { stripeSubscriptionId: { $exists: false } },
        { stripeSubscriptionId: null },
        { stripeSubscriptionId: '' },
      ],
    };

    const expired = await User.find({
      plan: { $ne: 'Free' },
      nextBillingDate: { $ne: null, $lt: now },
      ...manualGuard,
    }).select('_id email plan');

    let downgraded = 0;

    for (const business of expired) {
      // Idempotent, atomic flip: re-check the same guard so a concurrent runner
      // or a super-admin re-activation in the meantime is respected (only one
      // downgrade happens; a renewed expiry in the future no longer matches).
      const result = await User.findOneAndUpdate(
        {
          _id: business._id,
          plan: { $ne: 'Free' },
          nextBillingDate: { $lt: now },
          ...manualGuard,
        },
        {
          $set: { plan: 'Free', subscriptionStatus: 'canceled' },
          $unset: { nextBillingDate: '' },
        },
        { new: true },
      );
      if (!result) continue; // already handled / re-activated

      downgraded++;

      try {
        await Notification.create({
          recipient: business._id,
          recipientModel: 'User',
          title: 'Subscription expired',
          message: `Your ${business.plan} plan has expired and your account has been moved to the Free plan. Contact us to renew.`,
          type: 'warning',
          link: '/billing',
          action: 'subscription_expired',
        });
      } catch (notifErr) {
        console.error(
          '[CRON] subscription expiry notification error:',
          notifErr.message,
        );
      }

      try {
        await logActivity({
          action: 'subscription_expired',
          category: 'system',
          details: `Manual ${business.plan} subscription expired → downgraded to Free for ${business.email}`,
          metadata: { targetUserId: business._id, previousPlan: business.plan },
        });
      } catch (logErr) {
        console.error('[CRON] subscription expiry log error:', logErr.message);
      }
    }

    console.log(
      `[CRON] runSubscriptionExpiry: downgraded ${downgraded} business(es).`,
    );
  } catch (err) {
    console.error('[CRON] runSubscriptionExpiry ERROR:', err);
  }
};

module.exports = {
  runScheduledPayments,
  runTermDepositAutoMaturity,
  runSubscriptionExpiry,
};
