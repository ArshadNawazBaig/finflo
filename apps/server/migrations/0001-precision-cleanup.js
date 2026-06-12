/**
 * Migration 0001 — money precision cleanup.
 *
 * Ported from the one-off `scripts/fix-precision.js`. Normalises every stored
 * money field to the platform's canonical precision: a `Number` rounded to **2
 * decimal places** (rupees + paisa), via the shared `roundMoney` util — the same
 * boundary the Mongoose money setters enforce at rest.
 *
 * HISTORY: the original port rounded UP to a whole rupee (`Math.ceil`), back when
 * money was stored as whole rupees. The platform has since moved to 2 dp / paisa
 * precision (see `utils/money.js`), so ceiling here would CORRUPT live balances
 * (e.g. 945.60 → 946). This migration now rounds to 2 dp, which is a no-op on any
 * already-clean value and only repairs sub-paisa float drift (>2 dp residue).
 *
 * Idempotent: a value already at ≤2 dp is skipped (`isMoney` guard), so re-running
 * changes nothing — which is what makes it safe to live in the versioned migration
 * runner instead of being hand-run.
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
const { roundMoney, isMoney } = require('../src/utils/money');

const roundFields = async (Model, fields) => {
  const docs = await Model.find({});
  for (const doc of docs) {
    let updated = false;
    for (const field of fields) {
      // Skip empty/zero and anything already at canonical 2 dp precision.
      if (doc[field] && !isMoney(doc[field])) {
        doc[field] = roundMoney(doc[field]);
        updated = true;
      }
    }
    if (updated) await doc.save();
  }
};

module.exports = {
  name: '0001-precision-cleanup',
  up: async () => {
    await roundFields(Loan, [
      'principal',
      'rate',
      'duration',
      'emi',
      'totalAmount',
      'paidAmount',
      'remainingAmount',
    ]);
    await roundFields(Member, [
      'totalInvested',
      'currentBalance',
      'totalProfit',
      'totalWithdrawn',
      'profitRate',
      'monthlyIncome',
    ]);
    await roundFields(Repayment, ['amount']);
    await roundFields(Investment, ['amount', 'balanceAfter']);
    await roundFields(FinancialTransaction, ['amount']);
    await roundFields(ProfitDistribution, ['amount', 'investmentShare']);
    await roundFields(SavingGoal, ['targetAmount', 'currentAmount']);

    // Users hold an embedded invoices[] array — round each invoice amount.
    const users = await User.find({});
    for (const user of users) {
      let updated = false;
      if (user.invoices && user.invoices.length > 0) {
        user.invoices.forEach((invoice) => {
          if (invoice.amount && !isMoney(invoice.amount)) {
            invoice.amount = roundMoney(invoice.amount);
            updated = true;
          }
        });
      }
      if (updated) await user.save();
    }
  },
};
