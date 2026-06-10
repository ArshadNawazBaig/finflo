/**
 * One-off migration: attribute branch-less loans (and their disbursement ledger
 * rows) to the right branch so per-branch reports (Branch Analytics) stop showing
 * 0 for Disbursed / Outstanding / Active loans / Outflow.
 *
 *   node apps/server/src/scripts/backfillLoanBranchId.js
 *
 * Root cause: loans were created as `req.user.branchId || customer.branchId`, but
 * the business owner has no branchId and the Customer can lack one even when the
 * Member has it — so the loan landed with a null branch and fell out of every
 * branch card. This SAFELY fills ONLY missing branchIds (never reassigns a loan
 * that already has one), sourcing from customer.branchId, then the linked member's
 * branchId. It also aligns the loan's FinancialTransaction and Investment rows.
 *
 * Idempotent: re-running only touches docs still missing a branchId.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const FinancialTransaction = require('../models/FinancialTransaction');
const Investment = require('../models/Investment');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  const cursor = Loan.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  }).cursor();

  let loansFixed = 0;
  let ftFixed = 0;
  let invFixed = 0;

  for (let loan = await cursor.next(); loan != null; loan = await cursor.next()) {
    let branchId = null;
    const customer = await Customer.findById(loan.customer).select('branchId memberId');
    if (customer?.branchId) {
      branchId = customer.branchId;
    } else if (customer?.memberId) {
      const member = await Member.findById(customer.memberId).select('branchId');
      branchId = member?.branchId || null;
    }
    if (!branchId) continue; // nothing reliable to attribute to; leave as-is

    await Loan.updateOne({ _id: loan._id }, { $set: { branchId } });
    loansFixed += 1;

    // Align the loan's ledger rows that are also missing a branch.
    const ftRes = await FinancialTransaction.updateMany(
      { loan: loan._id, $or: [{ branchId: { $exists: false } }, { branchId: null }] },
      { $set: { branchId } },
    );
    ftFixed += ftRes.modifiedCount || 0;

    const invRes = await Investment.updateMany(
      { loan: loan._id, $or: [{ branchId: { $exists: false } }, { branchId: null }] },
      { $set: { branchId } },
    );
    invFixed += invRes.modifiedCount || 0;

    if (loansFixed % 500 === 0) console.log(`  ...${loansFixed} loans updated`);
  }

  console.log(
    `Done. Attributed ${loansFixed} loan(s), ${ftFixed} financial transaction(s), ${invFixed} investment(s).`,
  );
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
