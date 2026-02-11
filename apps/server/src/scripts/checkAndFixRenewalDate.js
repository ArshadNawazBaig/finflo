const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkAndFixRenewalDate() {
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

    console.log('\n=== CURRENT USER STATE ===');
    console.log('Email:', user.email);
    console.log('Plan:', user.plan);
    console.log('Subscription Status:', user.subscriptionStatus);
    console.log('Stripe Customer ID:', user.stripeCustomerId);
    console.log('Stripe Subscription ID:', user.stripeSubscriptionId);
    console.log('Next Billing Date:', user.nextBillingDate);

    if (!user.stripeCustomerId) {
      console.log('User has no Stripe customer ID');
      return;
    }

    // Fetch active subscriptions from Stripe
    console.log('\n=== FETCHING ACTIVE SUBSCRIPTIONS FROM STRIPE ===');
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 10,
    });

    console.log(
      `Active subscriptions found: ${activeSubscriptions.data.length}`,
    );

    if (activeSubscriptions.data.length > 0) {
      const subscription = activeSubscriptions.data[0];
      console.log('\nActive Subscription Details:');
      console.log('ID:', subscription.id);
      console.log('Status:', subscription.status);
      console.log(
        'Current Period End (timestamp):',
        subscription.current_period_end,
      );
      console.log(
        'Current Period End (date):',
        new Date(subscription.current_period_end * 1000),
      );
      console.log('Price ID:', subscription.items.data[0].price.id);

      // Validate the date
      const renewalDate = new Date(subscription.current_period_end * 1000);
      if (isNaN(renewalDate.getTime())) {
        console.error('Invalid renewal date from Stripe');
        mongoose.connection.close();
        return;
      }

      // Update user with correct data
      console.log('\n=== UPDATING USER WITH STRIPE DATA ===');
      user.stripeSubscriptionId = subscription.id;
      user.subscriptionStatus = 'active';
      user.nextBillingDate = renewalDate;

      // Determine plan from price ID
      const priceId = subscription.items.data[0].price.id;
      if (priceId === process.env.STRIPE_PRICE_ID_BASIC) {
        user.plan = 'Basic';
      } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
        user.plan = 'Pro';
      }

      await user.save();

      console.log('✅ User updated successfully');
      console.log('\n=== UPDATED USER STATE ===');
      console.log('Plan:', user.plan);
      console.log('Subscription Status:', user.subscriptionStatus);
      console.log('Stripe Subscription ID:', user.stripeSubscriptionId);
      console.log('Next Billing Date:', user.nextBillingDate);
    } else {
      console.log('No active subscriptions found in Stripe');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkAndFixRenewalDate();
