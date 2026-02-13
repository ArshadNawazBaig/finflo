require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const superAdminEmail = 'superadmin@loanmanagement.com';
    const superAdminPassword = 'SuperAdmin@123';

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

    if (existingSuperAdmin) {
      console.log('Super Admin already exists:');
      console.log(`  Email: ${superAdminEmail}`);
      console.log('  Password: [unchanged]');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: superAdminEmail,
      password: superAdminPassword,
      role: 'super_admin',
      isActive: true,
      businessName: 'Loan Management SaaS',
    });

    console.log('====================================');
    console.log('  Super Admin Created Successfully!');
    console.log('====================================');
    console.log(`  Email: ${superAdminEmail}`);
    console.log(`  Password: ${superAdminPassword}`);
    console.log('====================================');
    console.log('  ⚠️  Change this password in production!');
    console.log('====================================');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
