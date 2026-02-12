const mongoose = require('mongoose');
const User = require('./models/User');
const Customer = require('./models/Customer');
const path = require('path');
const fs = require('fs');

// Path to .env is in apps/server/.env
const envPath = path.join(__dirname, '..', '.env');
console.log('Env Path:', envPath);
if (fs.existsSync(envPath)) {
  const result = require('dotenv').config({ path: envPath });
  if (result.error) {
    console.error('Dotenv error:', result.error);
  }
} else {
  console.error('.env file not found at:', envPath);
}

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not found in env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const staffCount = await User.countDocuments({ role: 'staff' });
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    const customerCount = await Customer.countDocuments();

    console.log('\n--- Counts ---');
    console.log('Total Users (User collection):', userCount);
    console.log('Admins (Businesses):', adminCount);
    console.log('Staff:', staffCount);
    console.log('Super Admins:', superAdminCount);
    console.log('Total Customers (Customer collection):', customerCount);

    const customers = await Customer.find().limit(20);
    console.log('\n--- Sample Customers ---');
    console.log(customers.map((c) => ({ name: c.name, email: c.email })));

    const staff = await User.find({ role: 'staff' }).limit(10);
    console.log('\n--- Sample Staff ---');
    console.log(staff.map((s) => ({ name: s.name, email: s.email })));

    // Check for overlaps: Is any staff in Customer collection?
    const staffEmails = staff.map((s) => s.email.toLowerCase());
    const overlappingCustomers = await Customer.find({
      email: { $in: staffEmails },
    });

    console.log('\n--- Overlaps (Staff in Customer collection) ---');
    if (overlappingCustomers.length > 0) {
      console.log(
        overlappingCustomers.map((c) => ({ name: c.name, email: c.email })),
      );
    } else {
      console.log('None found.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
