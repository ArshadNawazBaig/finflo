require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Member = require('../models/Member');

/**
 * One-off migration: mark every EXISTING portal member as having completed
 * onboarding, so the new member setup wizard (gated on
 * `onboardingStatus.isCompleted`) does not trap members who already use the
 * portal. New members created after this runs still start with
 * `isCompleted: false` and go through the wizard.
 *
 * Run once after deploying the member onboarding wizard:
 *   node src/scripts/markExistingMembersOnboarded.js
 */
const markExistingMembersOnboarded = async () => {
  try {
    await connectDB();

    const result = await Member.updateMany(
      { 'onboardingStatus.isCompleted': { $ne: true } },
      { $set: { 'onboardingStatus.isCompleted': true } },
    );

    console.log(
      `Marked ${result.modifiedCount} existing member(s) as onboarded.`,
    );
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

markExistingMembersOnboarded();
