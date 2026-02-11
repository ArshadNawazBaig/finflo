const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
const Payment = require('../models/Payment');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function fixRefundedUser() {
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
    console.log('Stripe Customer ID:', user.stripeCustomerId);
    console.log('Stripe Subscription ID:', user.stripeSubscriptionId);
    console.log('Next Billing Date:', user.nextBillingDate);

    // Check for payment records
    const payments = await Payment.find({ user: user._id }).sort({ date: -1 });
    console.log('\n=== PAYMENT RECORDS ===');
    payments.forEach((p, i) => {
      console.log(
        `${i + 1}. Amount: $${p.amount}, Status: ${p.status}, Date: ${p.date}, Refunded At: ${p.refundedAt || 'N/A'}`,
      );
    });

    // Downgrade user to Free plan
    console.log('\n=== DOWNGRADING USER TO FREE PLAN ===');
    user.plan = 'Free';
    user.subscriptionStatus = 'canceled';
    user.stripeSubscriptionId = null;
    user.nextBillingDate = null;
    await user.save();

    console.log('✅ User successfully downgraded to Free plan');

    // Create refund payment record
    console.log('\n=== CREATING REFUND PAYMENT RECORD ===');
    const latestPayment = payments[0]; // Most recent payment

    const refundRecord = await Payment.create({
      user: user._id,
      amount: latestPayment.amount,
      currency: latestPayment.currency || 'usd',
      status: 'refunded',
      stripePaymentIntentId: latestPayment.stripePaymentIntentId,
      description: `Refund for ${latestPayment.description || 'subscription payment'}`,
      planName: 'Refund',
      date: new Date(),
      refundedAt: new Date(),
    });

    console.log('✅ Refund payment record created:', refundRecord._id);

    console.log('\n=== UPDATED USER STATE ===');
    console.log('Email:', user.email);
    console.log('New Plan:', user.plan);
    console.log('Subscription Status:', user.subscriptionStatus);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

fixRefundedUser();
