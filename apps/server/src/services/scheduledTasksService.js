const cron = require('node-cron');
const { wrap } = require('./jobHealth');
const logger = require('../utils/logger');
const {
  runOverdueDowngrade,
  runLateFeeAccrual,
  runRepaymentReminders,
  runLoanDefaultDetection,
  runCompoundInterestAccrual,
} = require('./jobs/loanJobs');
const {
  runSavingProfitAccrual,
  runMonthlySavingProfitDistribution,
} = require('./jobs/savingJobs');
const {
  runTrustRatingRecalc,
  runMemberBalanceReconcile,
  runDocumentExpiryScan,
  runCreditScoreRefresh,
} = require('./jobs/memberJobs');
const {
  runScheduledPayments,
  runTermDepositAutoMaturity,
  runSubscriptionExpiry,
} = require('./jobs/paymentJobs');

const initScheduledTasks = () => {
  // Every job is wrapped with jobHealth.wrap so each run's outcome (success /
  // failure / duration) is recorded and surfaced via /api/health — a silently
  // failing money job is now visible and alertable.

  // Job 1: Mark overdue loans daily at 00:05
  cron.schedule('5 0 * * *', wrap('runOverdueDowngrade', runOverdueDowngrade), {
    timezone: 'Asia/Karachi',
  });

  // Job 2: Apply late fees daily at 01:00 (only after tenure expiry)
  cron.schedule('0 1 * * *', wrap('runLateFeeAccrual', runLateFeeAccrual), {
    timezone: 'Asia/Karachi',
  });

  // Job 3: Send repayment reminders daily at 09:00
  cron.schedule('0 9 * * *', wrap('runRepaymentReminders', runRepaymentReminders), {
    timezone: 'Asia/Karachi',
  });

  // Job 4: Recalculate trust ratings every Sunday at 02:00
  cron.schedule('0 2 * * 0', wrap('runTrustRatingRecalc', runTrustRatingRecalc), {
    timezone: 'Asia/Karachi',
  });

  // Job 5: Daily saving profit accrual at 02:30
  cron.schedule('30 2 * * *', wrap('runSavingProfitAccrual', runSavingProfitAccrual), {
    timezone: 'Asia/Karachi',
  });

  // Job 6: Monthly saving profit distribution at 03:00 on the 1st of every month
  cron.schedule(
    '0 3 1 * *',
    wrap('runMonthlySavingProfitDistribution', runMonthlySavingProfitDistribution),
    { timezone: 'Asia/Karachi' },
  );

  // Job 7: Loan default detection daily at 01:30
  cron.schedule('30 1 * * *', wrap('runLoanDefaultDetection', runLoanDefaultDetection), {
    timezone: 'Asia/Karachi',
  });

  // Job 8: Compound interest accrual daily at 00:30
  cron.schedule(
    '30 0 * * *',
    wrap('runCompoundInterestAccrual', runCompoundInterestAccrual),
    { timezone: 'Asia/Karachi' },
  );

  // Job 9: Recurring scheduled payments daily at 06:00
  cron.schedule('0 6 * * *', wrap('runScheduledPayments', runScheduledPayments), {
    timezone: 'Asia/Karachi',
  });

  // Job 10: Auto-mature term deposits daily at 04:00
  cron.schedule(
    '0 4 * * *',
    wrap('runTermDepositAutoMaturity', runTermDepositAutoMaturity),
    { timezone: 'Asia/Karachi' },
  );

  // Job 11: Member balance reconciliation daily at 05:00.
  // Runs AFTER TD maturity (04:00) and BEFORE scheduled payments (06:00) so
  // the rebuild reflects the night's accruals and isn't races against debits.
  cron.schedule(
    '0 5 * * *',
    wrap('runMemberBalanceReconcile', runMemberBalanceReconcile),
    { timezone: 'Asia/Karachi' },
  );

  // Job 12: Goal auto-contribute (recurring) daily at 06:15. Runs after the
  // scheduled-payments job (06:00) so the source balance reflects any other
  // morning debits. The service itself enforces day-of-month + once-per-month
  // semantics; running daily is just a polling cadence.
  cron.schedule(
    '15 6 * * *',
    wrap('runMonthlyAutoContributions', async () => {
      const { runMonthlyAutoContributions } = require('./goalAutoContribute');
      const summary = await runMonthlyAutoContributions();
      if (summary.total > 0) {
        logger.info(
          { job: 'runMonthlyAutoContributions', ...summary },
          `[CRON] runMonthlyAutoContributions: ${summary.success} ok, ${summary.skipped} skipped, ${summary.failed} failed of ${summary.total} due.`,
        );
      }
    }),
    { timezone: 'Asia/Karachi' },
  );

  // Job 13: Document expiry scan + reminder fire at 07:00. Runs after the
  // morning reconcile/payment jobs so notifications don't compete for
  // member attention with payment alerts.
  cron.schedule('0 7 * * *', wrap('runDocumentExpiryScan', runDocumentExpiryScan), {
    timezone: 'Asia/Karachi',
  });

  // Job 14: Refresh credit-score snapshots daily at 02:45 (after savings
  // accrual, before the morning reconcile/payment jobs).
  cron.schedule('45 2 * * *', wrap('runCreditScoreRefresh', runCreditScoreRefresh), {
    timezone: 'Asia/Karachi',
  });

  // Job 15: Expire lapsed manual (non-Stripe) subscriptions daily at 00:15 —
  // downgrade businesses past their granted duration back to the Free plan.
  cron.schedule('15 0 * * *', wrap('runSubscriptionExpiry', runSubscriptionExpiry), {
    timezone: 'Asia/Karachi',
  });

  logger.info('[CRON] Scheduled Tasks Engine initialized. 15 jobs registered.');
};


module.exports = {
  initScheduledTasks,
  // run* job functions are re-exported for direct testing/invocation
  runOverdueDowngrade,
  runLateFeeAccrual,
  runRepaymentReminders,
  runTrustRatingRecalc,
  runSavingProfitAccrual,
  runMonthlySavingProfitDistribution,
  runLoanDefaultDetection,
  runCompoundInterestAccrual,
  runScheduledPayments,
  runTermDepositAutoMaturity,
  runSubscriptionExpiry,
  runMemberBalanceReconcile,
  runDocumentExpiryScan,
  runCreditScoreRefresh,
};
