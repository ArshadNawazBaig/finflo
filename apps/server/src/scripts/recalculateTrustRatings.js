const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
require('dotenv').config();

/**
 * Recalculate trust ratings for all customers based on their payment history
 * This script should be run once to fix ratings for customers who paid before
 * the trust rating system was properly implemented.
 */
async function recalculateTrustRatings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const customers = await Customer.find();
    console.log(`Found ${customers.length} customers to process`);

    for (const customer of customers) {
      console.log(`\nProcessing customer: ${customer.name}`);

      // Reset rating to default
      let newRating = 5.0;

      // Get all loans for this customer
      const loans = await Loan.find({ customer: customer._id });

      for (const loan of loans) {
        // Get all repayments for this loan
        const repayments = await Repayment.find({ loan: loan._id }).sort({
          date: 1,
        });

        let totalPaidSoFar = 0;

        for (const repayment of repayments) {
          const paymentAmount = Number(repayment.amount);
          const installmentsCovered = Math.floor(paymentAmount / loan.emi);
          const previouslyPaidInstallments = Math.floor(
            totalPaidSoFar / loan.emi,
          );

          const paymentDate = new Date(repayment.date);

          // Check each installment covered by this payment
          for (let i = 0; i < installmentsCovered; i++) {
            const installmentNumber = previouslyPaidInstallments + i + 1;
            const dueDate = new Date(loan.startDate);
            dueDate.setMonth(dueDate.getMonth() + installmentNumber);

            const isOnTime = paymentDate <= dueDate;
            const adjustment = isOnTime ? 0.2 : -0.5;
            newRating = Math.min(10, Math.max(0, newRating + adjustment));

            console.log(
              `  Installment ${installmentNumber}: ${isOnTime ? 'ON TIME' : 'LATE'} (${adjustment > 0 ? '+' : ''}${adjustment})`,
            );
          }

          totalPaidSoFar += paymentAmount;
        }
      }

      // Update customer rating
      customer.trustRating = newRating;
      await customer.save();

      console.log(
        `✓ Updated ${customer.name}'s rating: ${newRating.toFixed(1)}/10`,
      );
    }

    console.log('\n✅ All customer ratings recalculated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error recalculating trust ratings:', error);
    process.exit(1);
  }
}

recalculateTrustRatings();
