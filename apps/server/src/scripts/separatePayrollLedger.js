/**
 * separatePayrollLedger — one-off migration.
 *
 * Payroll salary disbursements used to be written into the business
 * `FinancialTransaction` ledger (category 'payroll', referenceModel 'Payslip'),
 * which polluted the business P&L / balance sheet / reports. They now live in a
 * dedicated `PayrollTransaction` ledger.
 *
 * This script moves history over and cleans the business ledger:
 *   1. For every `category: 'payroll'` FinancialTransaction, upsert an equivalent
 *      PayrollTransaction (idempotent — unique on payslip), deriving the missing
 *      refs from the linked Payslip.
 *   2. Delete those payroll rows from FinancialTransaction.
 *
 * Usage (from apps/server):
 *   node src/scripts/separatePayrollLedger.js            # migrate + delete
 *   node src/scripts/separatePayrollLedger.js --dry-run  # report only, no writes
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const FinancialTransaction = require('../models/FinancialTransaction');
const PayrollTransaction = require('../models/PayrollTransaction');
const Payslip = require('../models/Payslip');

const DRY_RUN = process.argv.includes('--dry-run');

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required (apps/server/.env)');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'MIGRATE + DELETE'}`);

  const query = { category: 'payroll' };
  const rows = await FinancialTransaction.find(query).lean();
  console.log(`Found ${rows.length} payroll FinancialTransaction row(s).`);

  if (rows.length === 0) {
    console.log('Nothing to migrate. Business ledger is already clean.');
    await mongoose.connection.close();
    return;
  }

  let migrated = 0;
  let orphan = 0;

  for (const ft of rows) {
    const payslipId = ft.referenceId;
    const payslip = payslipId
      ? await Payslip.findById(payslipId).lean()
      : null;

    if (!payslip) {
      // No payslip to derive employee/run from — can't form a valid payroll row.
      orphan += 1;
      continue;
    }

    if (!DRY_RUN) {
      await PayrollTransaction.findOneAndUpdate(
        { payslip: payslip._id },
        {
          $setOnInsert: {
            user: ft.user,
            branchId: ft.branchId || payslip.branchId,
            payrollRun: payslip.payrollRun,
            payslip: payslip._id,
            employee: payslip.employee,
            type: 'salary',
            amount: ft.amount,
            date: ft.date || ft.createdAt || new Date(),
            description: ft.description,
            paymentMethod:
              payslip.paymentMethod ||
              (ft.paymentMethod === 'cash' ? 'cash' : 'bank'),
            status: ft.status === 'Reversed' ? 'reversed' : 'completed',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
    migrated += 1;
  }

  console.log(
    `${DRY_RUN ? 'Would migrate' : 'Migrated'} ${migrated} row(s) into PayrollTransaction` +
      (orphan ? `; ${orphan} orphan row(s) with no payslip (will be deleted, not migrated).` : '.'),
  );

  if (!DRY_RUN) {
    const { deletedCount } = await FinancialTransaction.deleteMany(query);
    console.log(`Deleted ${deletedCount} payroll row(s) from FinancialTransaction.`);
    const remaining = await FinancialTransaction.countDocuments(query);
    console.log(`Remaining payroll rows in business ledger: ${remaining} (expect 0).`);
  } else {
    console.log('DRY RUN — no rows deleted.');
  }

  await mongoose.connection.close();
  console.log('Done.');
};

run().catch(async (err) => {
  console.error('Migration failed:', err.message);
  try {
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
