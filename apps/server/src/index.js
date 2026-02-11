require('dotenv').config();
// Force restart
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Webhook Route (Must be before express.json)
app.use(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/webhookRoutes'),
);

// Middleware
app.use(express.json());
app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error('Database middleware error:', error.message);
      res.status(500).json({
        message: 'Database connection failed',
        error: error.message,
      });
    }
  } else {
    next();
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/member-auth', require('./routes/memberAuthRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/repayments', require('./routes/repaymentRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/subscription', require('./routes/subscriptionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use(
  '/api/member-notifications',
  require('./routes/memberNotificationRoutes'),
);
app.use('/api/activity-logs', require('./routes/activityLogRoutes'));
app.use('/api/system-settings', require('./routes/systemSettingsRoutes'));
app.use('/api/revenue', require('./routes/revenueRoutes'));
app.use('/api/backup', require('./routes/backupRoutes'));
app.use('/api/tickets', require('./routes/supportTicketRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));

app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  try {
    await connectDB();
    res.json({
      status: 'ok',
      db: mongoose.connection.readyState,
      mongoUriSet: !!process.env.MONGO_URI,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      mongoUriSet: !!process.env.MONGO_URI,
    });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Loan Management API is running' });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;

// Force restart for revenue update verify (Timezone Fix)
