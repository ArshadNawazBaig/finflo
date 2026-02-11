const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function updateUserToFreePlan() {
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
    console.log('Current Plan:', user.plan);
    console.log('Subscription Status:', user.subscriptionStatus);
    console.log('Stripe Subscription ID:', user.stripeSubscriptionId);
    console.log('Next Billing Date:', user.nextBillingDate);

    // Update to Free plan
    console.log('\n=== UPDATING TO FREE PLAN ===');
    user.plan = 'Free';
    user.subscriptionStatus = 'canceled';
    user.stripeSubscriptionId = null;
    user.nextBillingDate = null;
    await user.save();

    console.log('✅ User updated to Free plan');
    console.log('\n=== UPDATED USER STATE ===');
    console.log('Email:', user.email);
    console.log('Plan:', user.plan);
    console.log('Subscription Status:', user.subscriptionStatus);
    console.log('Stripe Subscription ID:', user.stripeSubscriptionId);
    console.log('Next Billing Date:', user.nextBillingDate);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

updateUserToFreePlan();
