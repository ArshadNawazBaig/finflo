const cron = require('node-cron');
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
    const FinancialTransaction = require('../../models/FinancialTransaction');

    const duePayments = await ScheduledPayment.find({
      status: 'active',
      nextExecutionDate: { $lte: today },
    }).populate('member', 'name currentBalance savingBalance user branchId');

    let executed = 0;
    let failed = 0;

    for (const payment of duePayments) {
      try {
        const member = await Member.findById(payment.member._id);
        if (!member) {
          payment.status = 'failed';
          payment.failureReason = 'Member not found';
          await payment.save();
          failed++;
          continue;
        }

        const sourceBalance = payment.sourceAccount === 'saving'
          ? member.savingBalance
          : member.currentBalance;

        if (sourceBalance < payment.amount) {
          payment.status = 'failed';
          payment.failureReason = `Insufficient ${payment.sourceAccount} balance (needed ${payment.amount}, had ${sourceBalance})`;
          await payment.save();
          failed++;

          // Notify member of failure
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: '❌ Scheduled Payment Failed',
              message: `Your scheduled ${payment.type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'} of Rs. ${payment.amount.toLocaleString()} failed due to insufficient funds.`,
              type: 'error',
              branchId: member.branchId,
              action: 'scheduled_payment_failed',
              metadata: { scheduledPaymentId: payment._id },
            });
          } catch (notifErr) {
            console.error('[CRON] Scheduled payment notification error:', notifErr.message);
          }
          continue;
        }

        // Execute the payment
        if (payment.type === 'saving_deposit') {
          // Transfer from current/saving to saving
          if (payment.sourceAccount === 'current') {
            member.currentBalance -= payment.amount;
          }
          member.savingBalance += payment.amount;
          member.totalSavingDeposited = (member.totalSavingDeposited || 0) + payment.amount;
          await member.save({ validateBeforeSave: false });

          // Create investment record
          await Investment.create({
            user: member.user,
            member: member._id,
            branchId: member.branchId,
            type: 'deposit',
            accountType: 'saving',
            amount: payment.amount,
            description: `Auto: Scheduled monthly saving deposit`,
            balanceAfter: member.savingBalance,
          });

          await FinancialTransaction.create({
            user: member.user,
            branchId: member.branchId,
            type: 'credit',
            category: 'saving_deposit',
            amount: payment.amount,
            date: new Date(),
            description: `Auto: Scheduled saving deposit for ${member.name}`,
            member: member._id,
            paymentMethod: 'online',
          });
        } else if (payment.type === 'loan_repayment' && payment.loanId) {
          // Delegate to the shared loan repayment service so the repayment
          // is recorded with a proper interest/principal split, a
          // FinancialTransaction, an Investment ledger entry, and the
          // member's trust rating is updated. Doing the bookkeeping inline
          // skipped all of that and left repayments invisible to reports.
          const Loan = require('../../models/Loan');
          const Customer = require('../../models/Customer');
          const { processRepayment } = require('../loanRepaymentService');

          const loan = await Loan.findById(payment.loanId).populate('customer');
          if (!loan || loan.status === 'completed') {
            payment.status = 'completed';
            payment.failureReason = loan ? 'Loan already completed' : 'Loan not found';
            await payment.save();
            continue;
          }

          // Saving-account repayments aren't currently supported by the
          // service (it always debits currentBalance). Reject those rather
          // than silently double-counting against the wrong account.
          if (payment.sourceAccount && payment.sourceAccount !== 'current') {
            payment.status = 'failed';
            payment.failureReason =
              'Scheduled loan repayments can only be debited from the current account';
            await payment.save();
            failed++;
            continue;
          }

          const repaymentAmount = Math.min(payment.amount, loan.remainingAmount);

          // Build a minimal req-like context so logActivity / branch lookups work.
          const ctx = {
            user: {
              _id: member.user,
              effectiveOwnerId: member.user,
              branchId: member.branchId,
            },
          };

          await processRepayment(loan, repaymentAmount, ctx, {
            date: new Date(),
            notes: 'Automated scheduled loan repayment',
            isAutoValue: true,
            deductFromWallet: true,
            paymentMethod: 'online',
          });
        }

        // Update schedule
        payment.lastExecutedAt = new Date();
        payment.executionCount += 1;

        // Check if max executions reached
        if (payment.maxExecutions && payment.executionCount >= payment.maxExecutions) {
          payment.status = 'completed';
        } else {
          // Schedule next month
          const nextDate = new Date(payment.nextExecutionDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          payment.nextExecutionDate = nextDate;
        }
        payment.failureReason = undefined;
        await payment.save();
        executed++;

        // Notify member of success
        try {
          await createTransactionNotification({
            recipientId: member._id,
            title: '✅ Scheduled Payment Processed',
            message: `Your monthly ${payment.type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'} of Rs. ${payment.amount.toLocaleString()} has been processed successfully.`,
            type: 'success',
            branchId: member.branchId,
            action: 'scheduled_payment_success',
            metadata: { scheduledPaymentId: payment._id },
          });
        } catch (notifErr) {
          console.error('[CRON] Scheduled payment notification error:', notifErr.message);
        }
      } catch (paymentErr) {
        console.error(`[CRON] Error processing scheduled payment ${payment._id}:`, paymentErr.message);
        payment.status = 'failed';
        payment.failureReason = paymentErr.message;
        await payment.save();
        failed++;
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

module.exports = {
  runScheduledPayments,
  runTermDepositAutoMaturity,
};
