require('dotenv').config();
// Force restart
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const maintenanceMiddleware = require('./middleware/maintenanceMiddleware');
const { initACE } = require('./services/reminderService');

const app = express();

// Webhook Route (Must be before express.json)
app.use(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/webhookRoutes'),
);

// Middleware
app.use(express.json());

// Security Middleware
// const rateLimit = require('express-rate-limit');

// General API Rate Limiting
/*
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit to 1000 requests per 15 minutes
  message: {
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter Rate Limiting for Auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Increased limit to 200 requests per hour for login/forgot-password
  message: {
    message: 'Too many authentication attempts, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgotpassword', authLimiter);
*/

// Restrict CORS to CLIENT_URL
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Enhanced Helmet configuration
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", 'https://js.stripe.com'],
      },
    },
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

// Maintenance Mode Enforcement
app.use(maintenanceMiddleware);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/member-auth', require('./routes/memberAuthRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/repayments', require('./routes/repaymentRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/subscription', require('./routes/subscriptionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
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
app.use('/api/communication', require('./routes/communicationRoutes'));
app.use('/api/saving-goals', require('./routes/savingGoalRoutes'));

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
    initACE();
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  if (err.stack) console.error(err.stack);

  const statusCode = err.http_code || err.status || 500;

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;

// Force restart for revenue update verify (Timezone Fix)
