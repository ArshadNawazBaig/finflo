const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const connectDB = require('../config/db');
const User = require('../models/User');
const Payment = require('../models/Payment');

const importHistory = async () => {
  try {
    console.log('Connecting to database...');
    // Connect to DB (using logic from db.js or direct mongoose connect if needed)
    // Since we are inside scripts/, paths might be tricky for require config/db.
    // Let's assume standard connection string if connectDB fails or just use connectDB.
    await connectDB();
    console.log('Database connected.');

    console.log('Fetching invoices from Stripe...');
    let invoices = [];
    let hasMore = true;
    let lastId = null;

    while (hasMore) {
      const params = {
        limit: 100,
        status: 'paid',
      };
      if (lastId) params.starting_after = lastId;

      const response = await stripe.invoices.list(params);
      invoices = invoices.concat(response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        lastId = response.data[response.data.length - 1].id;
      }
    }

    console.log(`Found ${invoices.length} paid invoices.`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const invoice of invoices) {
      try {
        // Check if payment already exists
        const existingPayment = await Payment.findOne({
          stripeInvoiceId: invoice.id,
        });
        if (existingPayment) {
          skippedCount++;
          continue;
        }

        // Find user
        const customerId = invoice.customer;
        const user = await User.findOne({ stripeCustomerId: customerId });

        if (!user) {
          console.warn(
            `User not found for Stripe Customer ID: ${customerId} (Invoice: ${invoice.id})`,
          );
          // Optionally try to find by email if available in invoice
          // if (invoice.customer_email) { ... }
          errorCount++;
          continue;
        }

        // Create Payment
        await Payment.create({
          user: user._id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: 'succeeded',
          stripeInvoiceId: invoice.id,
          stripePaymentIntentId: invoice.payment_intent,
          description: invoice.description || `Invoice ${invoice.number}`,
          planName: user.plan, // Approximation
          date: new Date(invoice.created * 1000),
        });

        createdCount++;
        process.stdout.write('.'); // Progress indicator
      } catch (err) {
        console.error(`\nError processing invoice ${invoice.id}:`, err.message);
        errorCount++;
      }
    }

    console.log(
      '\n================================Status================================',
    );
    console.log(`Import Complete.`);
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped (Already Existed): ${skippedCount}`);
    console.log(`Errors (User Not Found, etc.): ${errorCount}`);
    console.log(
      '======================================================================',
    );

    process.exit(0);
  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
};

importHistory();
