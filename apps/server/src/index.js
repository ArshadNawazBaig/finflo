// Anchor the whole process to Asia/Karachi BEFORE any Date is constructed. All
// node-cron jobs and ledger writes already assume Karachi time; without this the
// process defaults to UTC in production (Vercel/Docker), so report period
// boundaries (getMonthDates, P&L windows, daily transfer-limit windows) landed up
// to 5 hours off and shuffled boundary transactions into the wrong month/day.
process.env.TZ = process.env.TZ || 'Asia/Karachi';

const path = require('path');
// Pre-load iconv-lite encodings
try {
  const iconv = require('iconv-lite');
  iconv.getCodec('utf8');
} catch (e) {
  console.error('Warning: Failed to pre-load iconv-lite encodings:', e.message);
}
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ── Required-secrets startup assertion ───────────────────────────────────────
// Fail fast if critical secrets are missing or obviously weak. This catches
// misdeployments (missing JWT_SECRET → tokens would be signed with `undefined`,
// breaking auth silently and inconsistently).
(function assertRequiredSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error(
      '[FATAL] JWT_SECRET is missing or shorter than 32 chars. Generate a strong secret: `openssl rand -hex 64`',
    );
    process.exit(1);
  }
  const weakSecrets = ['secret', 'dev_secret_key_123', 'changeme', 'jwt_secret'];
  if (weakSecrets.includes(jwtSecret.toLowerCase())) {
    console.error('[FATAL] JWT_SECRET is set to a known-weak placeholder. Rotate it.');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('[FATAL] MONGO_URI is required.');
    process.exit(1);
  }
})();

const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const maintenanceMiddleware = require('./middleware/maintenanceMiddleware');
const { initFinanceFlow } = require('./services/reminderService');
const { initScheduledTasks } = require('./services/scheduledTasksService');
const { corsMiddleware, helmetMiddleware, apiLimiter, authLimiter, otpLimiter, signupLimiter } = require('./config/security');
const setupStandardMiddleware = require('./middleware/standard');
const errorHandler = require('./middleware/errorHandler');
const { initSocket } = require('./socket/socketHandler');
const logger = require('./utils/logger');
const { initSentry } = require('./config/sentry');
const { getJobHealth, hasFailingJob } = require('./services/jobHealth');

// Initialise error tracking early (inert unless SENTRY_DSN is set).
initSentry();

const app = express();
const httpServer = http.createServer(app);

// Webhook Route (Must be before express.json)
app.use(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/webhookRoutes'),
);

// CORS must be first — handle preflight (OPTIONS) before any other middleware
app.use(corsMiddleware);
// Terminate preflight requests immediately after CORS headers are set
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Modular Middleware Setup
setupStandardMiddleware(app);

app.use(helmetMiddleware);

// Security: Sanitize inputs against NoSQL injection & HTTP param pollution.
// We sanitize body, params AND query (the previous custom sanitizer skipped
// req.query, which let attackers smuggle Mongo operators like ?status[$ne]=…).
const hpp = require('hpp');

const sanitizeMongoKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    // Strip any key starting with `$` (operator injection) or containing `.`
    // (path injection that can target nested fields like `__proto__.foo`).
    if (key.startsWith('$') || key.includes('.')) {
      try { delete obj[key]; } catch (_) { /* read-only — ignore */ }
    } else if (obj[key] && typeof obj[key] === 'object') {
      sanitizeMongoKeys(obj[key]);
    }
  }
};
app.use((req, res, next) => {
  sanitizeMongoKeys(req.body);
  sanitizeMongoKeys(req.params);
  // Express 5 makes req.query a getter; deep-sanitize the underlying values
  // (they're still mutable) — this neutralises operator injection in query
  // strings such as `?status[$ne]=resolved`.
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const v = req.query[key];
      if (v && typeof v === 'object') sanitizeMongoKeys(v);
    }
  }
  next();
});
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

// Rate Limiting (skip OPTIONS preflight requests)
app.use('/api/', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  apiLimiter(req, res, next);
});
// Generic limiter wrapper that lets preflights through.
const skipOptions = (limiter) => (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  limiter(req, res, next);
};

// Login endpoints — both User and Member portals.
app.use('/api/auth/login', skipOptions(authLimiter));
app.use('/api/auth/google', skipOptions(authLimiter));
app.use('/api/member-auth/login', skipOptions(authLimiter));

// Signup / password-reset request — anti-enumeration / email-bomb.
app.use('/api/auth/register', skipOptions(signupLimiter));
app.use('/api/auth/google/register', skipOptions(signupLimiter));
app.use('/api/auth/forgotpassword', skipOptions(signupLimiter));
app.use('/api/member-auth/forgotpassword', skipOptions(signupLimiter));

// OTP / 2FA / PIN verification — keep the search space from being brute-forced.
app.use('/api/auth/verify-email', skipOptions(otpLimiter));
app.use('/api/auth/verify-2fa-login', skipOptions(otpLimiter));
app.use('/api/auth/verify-2fa', skipOptions(otpLimiter));
app.use('/api/auth/resetpassword', skipOptions(otpLimiter));
app.use('/api/auth/force-change-password', skipOptions(otpLimiter));
app.use('/api/member-auth/verify-email', skipOptions(otpLimiter));
app.use('/api/member-auth/verify-2fa-login', skipOptions(otpLimiter));
app.use('/api/member-auth/resetpassword', skipOptions(otpLimiter));
app.use('/api/member-auth/force-change-password', skipOptions(otpLimiter));
app.use('/api/transaction-pin/verify-reset-otp', skipOptions(otpLimiter));
app.use('/api/transaction-pin/verify', skipOptions(otpLimiter));

// Database Connection Middleware (Safety Net — only reconnects if disconnected)
const mongoose = require('mongoose');
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (error) {
      console.error('Database middleware error:', error.message);
      return res.status(500).json({
        message: 'Database connection failed',
        error: error.message,
      });
    }
  }
  next();
});

app.use(maintenanceMiddleware);

// Centralized Routing
app.use('/api', require('./routes'));

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    const jobs = getJobHealth();
    const degraded = hasFailingJob();
    res.status(degraded ? 503 : 200).json({
      // `status` stays 'ok' for backward compatibility with existing probes;
      // `degraded` flags a failing scheduled job (money cron silently broke).
      status: degraded ? 'degraded' : 'ok',
      db: mongoose.connection.readyState, // 1 = connected
      mongoUriSet: !!process.env.MONGO_URI,
      jobs: {
        registered: jobs.length,
        failing: jobs.filter(
          (j) => j.lastErrorAt && (!j.lastSuccessAt || j.lastErrorAt > j.lastSuccessAt),
        ).length,
        detail: jobs,
      },
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// In production, this single service also serves the built client SPA
// (root `npm run build` outputs to `<repo>/public`). Mirrors the rewrite
// rule in vercel.json: anything not under /api, /socket.io, or /uploads
// falls back to index.html so React Router can handle the route.
const fs = require('fs');
const clientDist = path.resolve(__dirname, '../../../public');
const clientIndexHtml = path.join(clientDist, 'index.html');
const clientBuildExists = fs.existsSync(clientIndexHtml);

if (clientBuildExists) {
  app.use(express.static(clientDist, { index: false, maxAge: '1y', etag: true }));
  app.get(/^(?!\/api(?:\/|$)|\/socket\.io(?:\/|$)|\/uploads(?:\/|$)).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(clientIndexHtml);
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'FinFlo API is running' });
  });
}

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (on all interfaces)`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

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
