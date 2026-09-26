// Vercel schedules use UTC; local schedules retain their existing timezones.
const definitions = [
  ['overdue', '5 0 * * *', '5 19 * * *', 'loanJobs', 'runOverdueDowngrade'],
  ['late-fees', '0 1 * * *', '0 20 * * *', 'loanJobs', 'runLateFeeAccrual'],
  ['repayment-reminders', '0 9 * * *', '0 4 * * *', 'loanJobs', 'runRepaymentReminders'],
  ['trust-ratings', '0 2 * * 0', '0 21 * * 6', 'memberJobs', 'runTrustRatingRecalc'],
  ['saving-accrual', '30 2 * * *', '30 21 * * *', 'savingJobs', 'runSavingProfitAccrual'],
  ['saving-distribution', '0 3 1 * *', '0 22 * * *', 'savingJobs', 'runMonthlySavingProfitDistribution'],
  ['loan-defaults', '30 1 * * *', '30 20 * * *', 'loanJobs', 'runLoanDefaultDetection'],
  ['compound-interest', '30 0 * * *', '30 19 * * *', 'loanJobs', 'runCompoundInterestAccrual'],
  ['scheduled-payments', '0 6 * * *', '0 1 * * *', 'paymentJobs', 'runScheduledPayments'],
  ['term-deposits', '0 4 * * *', '0 23 * * *', 'paymentJobs', 'runTermDepositAutoMaturity'],
  ['balance-reconcile', '0 5 * * *', '0 0 * * *', 'memberJobs', 'runMemberBalanceReconcile'],
  ['goal-contributions', '15 6 * * *', '15 1 * * *', null, 'runMonthlyAutoContributions'],
  ['document-expiry', '0 7 * * *', '0 2 * * *', 'memberJobs', 'runDocumentExpiryScan'],
  ['credit-scores', '45 2 * * *', '45 21 * * *', 'memberJobs', 'runCreditScoreRefresh'],
  ['subscription-expiry', '15 0 * * *', '15 19 * * *', 'paymentJobs', 'runSubscriptionExpiry'],
  ['customer-reminders', '0 0 * * *', '0 0 * * *', null, 'runReminderService'],
];

const jobs = definitions.map(([id, schedule, utcSchedule, moduleName, name]) => ({
  id, name, schedule, utcSchedule,
  timezone: id === 'customer-reminders' ? 'UTC' : 'Asia/Karachi',
  run: async () => {
    if (id === 'goal-contributions') {
      const result = await require('./goalAutoContribute').runMonthlyAutoContributions();
      if (result.failed) throw new Error(`${result.failed} goal contributions failed`);
      return result;
    }
    if (id === 'customer-reminders') return require('./reminderService').runReminderService();
    return require(`./jobs/${moduleName}`)[name]();
  },
}));

const dateParts = (date, timeZone) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date).map(({ type, value }) => [type, value]),
);

const runPeriod = (job, date = new Date()) => {
  const parts = dateParts(date, job.timezone);
  // The UTC day before the first of a month is variable, so its cron ticks daily.
  if (job.id === 'saving-distribution' && parts.day !== '01') return null;
  if (job.id === 'trust-ratings' && parts.weekday !== 'Sun') return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
};

module.exports = { jobs, runPeriod };
