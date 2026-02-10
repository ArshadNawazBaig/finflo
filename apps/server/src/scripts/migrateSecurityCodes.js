const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for migration'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const User = require('../models/User');

const generateSecurityCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const migrateSecurityCodes = async () => {
  try {
    console.log('Starting security code migration...');

    // Find all users without security codes
    const usersWithoutCodes = await User.find({
      $or: [{ securityCode: { $exists: false } }, { securityCode: null }],
    });

    console.log(
      `Found ${usersWithoutCodes.length} users without security codes`,
    );

    for (const user of usersWithoutCodes) {
      let codeIsUnique = false;
      let securityCode;

      while (!codeIsUnique) {
        securityCode = generateSecurityCode();
        const existingUser = await User.findOne({ securityCode });
        if (!existingUser) {
          codeIsUnique = true;
        }
      }

      // Update using updateOne to bypass pre-save hooks
      await User.updateOne(
        { _id: user._id },
        { $set: { securityCode } },
        { runValidators: false },
      );

      console.log(
        `✓ Generated code ${securityCode} for user: ${user.email} (${user.businessName || user.name})`,
      );
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(
      `Updated ${usersWithoutCodes.length} users with security codes.`,
    );
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateSecurityCodes();
