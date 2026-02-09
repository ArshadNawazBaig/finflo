require('dotenv').config({ path: './apps/server/.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const seedBilling = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin user or first user
    const user = await User.findOne({});
    if (!user) {
      console.log('No user found');
      return;
    }

    console.log(`Updating user: ${user.email}`);

    user.plan = 'Pro';
    user.subscriptionStatus = 'active';
    user.nextBillingDate = new Date('2026-03-01');
    user.paymentMethods = [
      {
        brand: 'Mastercard',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2028,
        isDefault: true,
      },
      {
        brand: 'Visa',
        last4: '8833',
        expiryMonth: 9,
        expiryYear: 2027,
        isDefault: false,
      },
    ];
    user.invoices = [
      {
        id: 'INV-0012',
        date: new Date('2026-02-01'),
        amount: 49.0,
        status: 'Paid',
      },
      {
        id: 'INV-0011',
        date: new Date('2026-01-01'),
        amount: 49.0,
        status: 'Paid',
      },
      {
        id: 'INV-0010',
        date: new Date('2025-12-01'),
        amount: 49.0,
        status: 'Paid',
      },
    ];

    await user.save();
    console.log('Billing data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding billing data', error);
    process.exit(1);
  }
};

seedBilling();
