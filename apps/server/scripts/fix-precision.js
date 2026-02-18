const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Loan = require('../src/models/Loan');
const Member = require('../src/models/Member');
const Repayment = require('../src/models/Repayment');
const Investment = require('../src/models/Investment');
const FinancialTransaction = require('../src/models/FinancialTransaction');
const ProfitDistribution = require('../src/models/ProfitDistribution');
const SavingGoal = require('../src/models/SavingGoal');
const User = require('../src/models/User');

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    // 1. Loans
    console.log('Migrating Loans...');
    const loans = await Loan.find({});
    for (const loan of loans) {
      let updated = false;
      [
        'principal',
        'rate',
        'duration',
        'emi',
        'totalAmount',
        'paidAmount',
        'remainingAmount',
      ].forEach((field) => {
        if (loan[field] && !Number.isInteger(loan[field])) {
          loan[field] = Math.ceil(loan[field]);
          updated = true;
        }
      });
      if (updated) await loan.save();
    }
    console.log(`Migrated ${loans.length} Loans.`);

    // 2. Members
    console.log('Migrating Members...');
    const members = await Member.find({});
    for (const member of members) {
      let updated = false;
      [
        'totalInvested',
        'currentBalance',
        'totalProfit',
        'totalWithdrawn',
        'profitRate',
        'monthlyIncome',
      ].forEach((field) => {
        if (member[field] && !Number.isInteger(member[field])) {
          member[field] = Math.ceil(member[field]);
          updated = true;
        }
      });
      if (updated) await member.save();
    }
    console.log(`Migrated ${members.length} Members.`);

    // 3. Repayments
    console.log('Migrating Repayments...');
    const repayments = await Repayment.find({});
    for (const repayment of repayments) {
      if (repayment.amount && !Number.isInteger(repayment.amount)) {
        repayment.amount = Math.ceil(repayment.amount);
        await repayment.save();
      }
    }
    console.log(`Migrated ${repayments.length} Repayments.`);

    // 4. Investments
    console.log('Migrating Investments...');
    const investments = await Investment.find({});
    for (const investment of investments) {
      let updated = false;
      ['amount', 'balanceAfter'].forEach((field) => {
        if (investment[field] && !Number.isInteger(investment[field])) {
          investment[field] = Math.ceil(investment[field]);
          updated = true;
        }
      });
      if (updated) await investment.save();
    }
    console.log(`Migrated ${investments.length} Investments.`);

    // 5. Financial Transactions
    console.log('Migrating Financial Transactions...');
    const txs = await FinancialTransaction.find({});
    for (const tx of txs) {
      if (tx.amount && !Number.isInteger(tx.amount)) {
        tx.amount = Math.ceil(tx.amount);
        await tx.save();
      }
    }
    console.log(`Migrated ${txs.length} Financial Transactions.`);

    // 6. Profit Distributions
    console.log('Migrating Profit Distributions...');
    const distributions = await ProfitDistribution.find({});
    for (const dist of distributions) {
      let updated = false;
      ['amount', 'investmentShare'].forEach((field) => {
        if (dist[field] && !Number.isInteger(dist[field])) {
          dist[field] = Math.ceil(dist[field]);
          updated = true;
        }
      });
      if (updated) await dist.save();
    }
    console.log(`Migrated ${distributions.length} Profit Distributions.`);

    // 7. Saving Goals
    console.log('Migrating Saving Goals...');
    const goals = await SavingGoal.find({});
    for (const goal of goals) {
      let updated = false;
      ['targetAmount', 'currentAmount'].forEach((field) => {
        if (goal[field] && !Number.isInteger(goal[field])) {
          goal[field] = Math.ceil(goal[field]);
          updated = true;
        }
      });
      if (updated) await goal.save();
    }
    console.log(`Migrated ${goals.length} Saving Goals.`);

    // 8. Users (Invoices)
    console.log('Migrating Users (Invoices)...');
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
    console.log(`Migrated ${users.length} Users.`);

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
