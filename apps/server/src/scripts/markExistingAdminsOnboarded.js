require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * One-off migration: mark every EXISTING business admin as having completed
 * onboarding, so the new first-run setup wizard (gated on
 * `onboardingStatus.isCompleted`) does not trap tenants who are already
 * operational. New sign-ups after this runs still start with
 * `isCompleted: false` and go through the wizard.
 *
 * Run once after deploying the business onboarding wizard:
 *   node src/scripts/markExistingAdminsOnboarded.js
 */
const markExistingAdminsOnboarded = async () => {
  try {
    await connectDB();

    const result = await User.updateMany(
      { role: 'admin', 'onboardingStatus.isCompleted': { $ne: true } },
      { $set: { 'onboardingStatus.isCompleted': true } },
    );

    console.log(
      `Marked ${result.modifiedCount} existing admin(s) as onboarded.`,
    );
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

markExistingAdminsOnboarded();
