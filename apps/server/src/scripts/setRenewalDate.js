const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function setRenewalDate() {
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
    console.log('Next Billing Date:', user.nextBillingDate);

    // Set renewal date to 30 days from now (typical monthly subscription)
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    console.log('\n=== SETTING RENEWAL DATE ===');
    console.log('New Renewal Date:', renewalDate);

    user.nextBillingDate = renewalDate;
    await user.save();

    console.log('✅ Renewal date updated successfully');
    console.log('\n=== UPDATED USER STATE ===');
    console.log('Email:', user.email);
    console.log('Plan:', user.plan);
    console.log('Next Billing Date:', user.nextBillingDate);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

setRenewalDate();
