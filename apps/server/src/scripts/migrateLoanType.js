require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const FinancialTransaction = require('../models/FinancialTransaction');

const migrate = async () => {
  try {
    await connectDB();
    console.log('Connected to database...');

    // Update all loan_disbursement records from type 'expense' to type 'loan'
    const result = await FinancialTransaction.updateMany(
      { category: 'loan_disbursement', type: 'expense' },
      { $set: { type: 'loan' } },
    );

    console.log(
      `Updated ${result.modifiedCount} loan disbursement records from type 'expense' to type 'loan'.`,
    );
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
