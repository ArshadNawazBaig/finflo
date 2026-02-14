require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const FinancialTransaction = require('../models/FinancialTransaction');
const Repayment = require('../models/Repayment');
const Investment = require('../models/Investment');
const ProfitDistribution = require('../models/ProfitDistribution');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Member = require('../models/Member');
const User = require('../models/User');
const Branch = require('../models/Branch');

const backfill = async () => {
  try {
    await connectDB();
    console.log('Connected to database...');

    // Clear existing ledger to avoid duplicates during backfill if run multiple times
    // Uncomment if you want to wipe it first:
    // await FinancialTransaction.deleteMany({});
    // console.log('Cleared existing ledger.');

    const transactions = [];

    // 1. Backfill Repayments (Income)
    console.log('Fetching repayments...');
    const repayments = await Repayment.find().populate('customer', 'name');
    repayments.forEach((r) => {
      transactions.push({
        user: r.user,
        branchId: r.branchId,
        type: 'income',
        category: 'repayment',
        amount: r.amount,
        date: r.date,
        description:
          r.notes || `Loan repayment for ${r.customer?.name || 'Unknown'}`,
        customer: r.customer?._id || r.customer,
        loan: r.loan,
        referenceId: r._id,
        referenceModel: 'Repayment',
      });
    });

    // 2. Backfill Investments (Income/Expense)
    console.log('Fetching investments...');
    const investments = await Investment.find().populate('member', 'name');
    investments.forEach((i) => {
      transactions.push({
        user: i.user,
        branchId: i.branchId,
        type: i.type === 'deposit' ? 'income' : 'expense',
        category: i.type === 'deposit' ? 'investment' : 'withdrawal',
        amount: i.amount,
        date: i.date,
        description:
          i.description ||
          `${i.type} of ${i.amount} for ${i.member?.name || 'Unknown'}`,
        member: i.member?._id || i.member,
        referenceId: i._id,
        referenceModel: 'Investment',
      });
    });

    // 3. Backfill Profit Distributions (Expense)
    console.log('Fetching profit distributions...');
    const profits = await ProfitDistribution.find();
    profits.forEach((p) => {
      transactions.push({
        user: p.user,
        branchId: p.branchId,
        type: 'expense',
        category: 'profit_distribution',
        amount: p.amount,
        date: p.date,
        description: `Profit distribution for ${p.period}`,
        member: p.member,
        referenceId: p._id,
        referenceModel: 'ProfitDistribution',
      });
    });

    // 4. Backfill Active Loans (Disbursements - Expense)
    console.log('Fetching active loans...');
    const loans = await Loan.find({
      status: { $in: ['active', 'completed'] },
    }).populate('customer', 'name');
    loans.forEach((l) => {
      transactions.push({
        user: l.user,
        branchId: l.branchId,
        type: 'expense',
        category: 'loan_disbursement',
        amount: l.principal,
        date: l.approvedAt || l.startDate || l.createdAt,
        description: `Loan disbursement for ${l.customer?.name || 'Unknown'}`,
        customer: l.customer?._id || l.customer,
        loan: l._id,
        referenceId: l._id,
        referenceModel: 'Loan',
      });
    });

    if (transactions.length > 0) {
      console.log(
        `Inserting ${transactions.length} transactions into ledger...`,
      );
      await FinancialTransaction.insertMany(transactions);
      console.log('Backfill completed successfully!');
    } else {
      console.log('No transactions found to backfill.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
};

backfill();
