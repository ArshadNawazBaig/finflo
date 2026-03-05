require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const SystemSettings = require('../models/SystemSettings');

const disableMaintenanceMode = async () => {
  try {
    await connectDB();

    const settings = await SystemSettings.getSettings();
    settings.maintenanceMode = false;
    await settings.save();

    console.log('====================================');
    console.log('  Maintenance Mode Disabled!');
    console.log('====================================');

    process.exit(0);
  } catch (error) {
    console.error('Error disabling maintenance mode:', error);
    process.exit(1);
  }
};

disableMaintenanceMode();
