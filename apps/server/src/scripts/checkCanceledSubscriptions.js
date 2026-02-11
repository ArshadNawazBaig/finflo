const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkCanceledSubscriptions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const userEmail = 'free@ex.com';

    // Find the user
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log(`User ${userEmail} not found`);
      return;
    }

    console.log('\n=== USER INFO ===');
    console.log('Email:', user.email);
    console.log('Stripe Customer ID:', user.stripeCustomerId);

    if (!user.stripeCustomerId) {
      console.log('User has no Stripe customer ID');
      return;
    }

    // Fetch all subscriptions for this customer (all statuses)
    console.log('\n=== FETCHING ALL SUBSCRIPTIONS (ALL STATUSES) ===');
    const allSubscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit: 100,
      status: 'all', // Get all statuses
    });

    console.log(`Total subscriptions found: ${allSubscriptions.data.length}`);

    const canceledSubs = allSubscriptions.data.filter(
      (s) => s.status === 'canceled',
    );
    console.log(`Canceled subscriptions: ${canceledSubs.length}`);

    allSubscriptions.data.forEach((sub, i) => {
      console.log(`\n${i + 1}. Subscription ID: ${sub.id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(
        `   Created: ${new Date(sub.created * 1000).toLocaleString()}`,
      );
      console.log(
        `   Current Period: ${new Date(sub.current_period_start * 1000).toLocaleDateString()} - ${new Date(sub.current_period_end * 1000).toLocaleDateString()}`,
      );
      if (sub.canceled_at) {
        console.log(
          `   Canceled At: ${new Date(sub.canceled_at * 1000).toLocaleString()}`,
        );
      }
      if (sub.ended_at) {
        console.log(
          `   Ended At: ${new Date(sub.ended_at * 1000).toLocaleString()}`,
        );
      }
      if (sub.items && sub.items.data.length > 0) {
        console.log(`   Price ID: ${sub.items.data[0].price.id}`);
      }
    });

    // Fetch all invoices
    console.log('\n=== FETCHING ALL INVOICES ===');
    const allInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100,
    });

    console.log(`Total invoices found: ${allInvoices.data.length}`);

    allInvoices.data.forEach((inv, i) => {
      console.log(`\n${i + 1}. Invoice: ${inv.number || inv.id}`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Amount: $${inv.total / 100}`);
      console.log(
        `   Created: ${new Date(inv.created * 1000).toLocaleString()}`,
      );
      console.log(`   Subscription: ${inv.subscription || 'N/A'}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkCanceledSubscriptions();
