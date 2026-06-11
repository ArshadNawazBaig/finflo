/**
 * Migration 0001 — money precision cleanup.
 *
 * Ported from the one-off `scripts/fix-precision.js`. Rounds every stored money
 * field UP to a whole rupee (`Math.ceil`, matching the original repair's choice
 * to never undercharge). Idempotent: once a field is an integer the guard skips
 * it, so re-running changes nothing — which is what makes it safe to live in the
 * versioned migration runner instead of being hand-run.
 *
 * This is the TEMPLATE for porting the remaining ad-hoc scripts (backfillLedger,
 * backfillOutstandingPrincipal, fixOrphanTransactions, …) into versioned
 * migrations. A migration exports `{ name?, up({ mongoose, connection }) }`.
 */
const Loan = require('../src/models/Loan');
const Member = require('../src/models/Member');
const Repayment = require('../src/models/Repayment');
const Investment = require('../src/models/Investment');
const FinancialTransaction = require('../src/models/FinancialTransaction');
const ProfitDistribution = require('../src/models/ProfitDistribution');
const SavingGoal = require('../src/models/SavingGoal');
const User = require('../src/models/User');

const ceilFields = async (Model, fields) => {
  const docs = await Model.find({});
  for (const doc of docs) {
    let updated = false;
    for (const field of fields) {
      if (doc[field] && !Number.isInteger(doc[field])) {
        doc[field] = Math.ceil(doc[field]);
        updated = true;
      }
    }
    if (updated) await doc.save();
  }
};

module.exports = {
  name: '0001-precision-cleanup',
  up: async () => {
    await ceilFields(Loan, [
      'principal',
      'rate',
      'duration',
      'emi',
      'totalAmount',
      'paidAmount',
      'remainingAmount',
    ]);
    await ceilFields(Member, [
      'totalInvested',
      'currentBalance',
      'totalProfit',
      'totalWithdrawn',
      'profitRate',
      'monthlyIncome',
    ]);
    await ceilFields(Repayment, ['amount']);
    await ceilFields(Investment, ['amount', 'balanceAfter']);
    await ceilFields(FinancialTransaction, ['amount']);
    await ceilFields(ProfitDistribution, ['amount', 'investmentShare']);
    await ceilFields(SavingGoal, ['targetAmount', 'currentAmount']);

    // Users hold an embedded invoices[] array — ceil each invoice amount.
    const users = await User.find({});
    for (const user of users) {
      let updated = false;
      if (user.invoices && user.invoices.length > 0) {
        user.invoices.forEach((invoice) => {
          if (invoice.amount && !Number.isInteger(invoice.amount)) {
            invoice.amount = Math.ceil(invoice.amount);
            updated = true;
          }
        });
      }
      if (updated) await user.save();
    }
  },
};
