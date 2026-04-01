const path = require('path');
// Pre-load iconv-lite encodings
try {
  const iconv = require('iconv-lite');
  iconv.getCodec('utf8');
} catch (e) {
  console.error('Warning: Failed to pre-load iconv-lite encodings:', e.message);
}
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const maintenanceMiddleware = require('./middleware/maintenanceMiddleware');
const { initFinanceFlow } = require('./services/reminderService');
const { initScheduledTasks } = require('./services/scheduledTasksService');
const { corsMiddleware, helmetMiddleware, apiLimiter, authLimiter } = require('./config/security');
const setupStandardMiddleware = require('./middleware/standard');
const errorHandler = require('./middleware/errorHandler');
const { initSocket } = require('./socket/socketHandler');

const app = express();
const httpServer = http.createServer(app);

// Webhook Route (Must be before express.json)
app.use(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/webhookRoutes'),
);

// Modular Middleware Setup
setupStandardMiddleware(app);
app.use(corsMiddleware);
app.use(helmetMiddleware);

// Security: Sanitize inputs against NoSQL injection & HTTP param pollution
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
app.use(mongoSanitize());
app.use(hpp());

// Socket.io initialization
const clientUrl = process.env.CLIENT_URL || 'https://loan-master-client.vercel.app';
const io = initSocket(httpServer, clientUrl);

// Database Connection & Background Services
const startBackgroundServices = () => {
  try {
    initFinanceFlow();
    initScheduledTasks();
    console.log('[Init] Background services started');
  } catch (error) {
    console.error('[Init] Failed to start background services:', error.message);
  }
};

// Connect to DB and then start services
connectDB()
  .then(() => {
    startBackgroundServices();
  })
  .catch((err) => {
    console.error('[Critical] DB Connection failed on startup:', err.message);
  });

// Socket instance for middleware
app.use((req, res, next) => {
  req.io = io;
  if (req.url.startsWith('/socket.io') && io) {
    return io.handleRequest(req, res);
  }
  next();
});

// Rate Limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgotpassword', authLimiter);
app.use('/api/member-auth/login', authLimiter);

// Database Connection Middleware (Safety Net)
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

app.use(maintenanceMiddleware);

// Centralized Routing
app.use('/api', require('./routes'));

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
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'FinFlo API is running' });
});

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (on all interfaces)`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const gracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Graceful shutdown initiated...`);
  httpServer.close(async () => {
    console.log('[Shutdown] HTTP server closed. Cleaning up...');
    try {
      await mongoose.connection.close();
      console.log('[Shutdown] Database connection closed.');
    } catch (err) {
      console.error('[Shutdown] Error closing DB:', err.message);
    }
    process.exit(0);
  });

  // Force kill if shutdown takes too long (e.g. stuck connections)
  setTimeout(() => {
    console.error('[Shutdown] Forced exit after 10s timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
