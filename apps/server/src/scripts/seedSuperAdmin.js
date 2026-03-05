require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const superAdminEmail = 'arshadnawazbaig@gmail.com';
    const superAdminPassword = 'Arshadnb@10';

    // Check if super admin already exists
    let superAdmin = await User.findOne({ role: 'super_admin' });

    if (superAdmin) {
      console.log('Super Admin found, updating credentials...');
      superAdmin.email = superAdminEmail;
      superAdmin.password = superAdminPassword;
      superAdmin.isActive = true;
      await superAdmin.save();
    } else {
      console.log('Super Admin not found, creating new...');
      superAdmin = await User.create({
        name: 'Super Admin',
        email: superAdminEmail,
        password: superAdminPassword,
        role: 'super_admin',
        isActive: true,
        businessName: 'FinFlo',
      });
    }

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
