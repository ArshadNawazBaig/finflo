const path = require('path');
// Pre-load iconv-lite encodings to prevent "CANNOT FIND MODULE '../ENCODINGS'" error in certain environments
try {
  const iconv = require('iconv-lite');
  iconv.getCodec('utf8');
} catch (e) {
  console.error('Warning: Failed to pre-load iconv-lite encodings:', e.message);
}
require('dotenv').config({ path: path.join(__dirname, '../.env') });
// Force restart
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const maintenanceMiddleware = require('./middleware/maintenanceMiddleware');
const { initFinanceFlow } = require('./services/reminderService');
const { initScheduledTasks } = require('./services/scheduledTasksService');

const app = express();

// Webhook Route (Must be before express.json)
app.use(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/webhookRoutes'),
);

// Global Request Logger for Debugging
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`,
  );
  next();
});

// Middleware
app.use(express.json());
app.use(require('cookie-parser')());

// Socket.io instance placeholder for middleware
let ioInstance;
app.use((req, res, next) => {
  req.io = ioInstance;
  next();
});

// Security Middleware
const rateLimit = require('express-rate-limit');

// General API Rate Limiting
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
app.use('/api/member-auth/login', authLimiter);

// Restrict CORS to CLIENT_URL and mobile dev origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'https://loan-master-client.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'capacitor://localhost',
  'http://localhost',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Debug log for EVERY request with an origin
    if (origin) console.log(`CORS Preflight/Request from origin: ${origin}`);

    // Check if origin is allowed
    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' &&
        (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(
            origin,
          )));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
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
        connectSrc: [
          "'self'",
          'https://api.stripe.com',
          'http://localhost:*',
          'http://127.0.0.1:*',
          'http://192.168.*.*:*',
        ],
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
app.use('/api/ledger', require('./routes/ledgerRoutes'));
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
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/external-transfers', require('./routes/externalTransferRoutes'));
app.use('/api/loan-products', require('./routes/loanProductRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

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
  res.json({ message: 'FinanceFlow API is running' });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  const http = require('http');
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');
  const Member = require('./models/Member');
  const User = require('./models/User');

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'capacitor://localhost',
        process.env.CLIENT_URL || 'https://loan-master-client.vercel.app',
      ],
      credentials: true,
    },
  });

  ioInstance = io;

  // Socket.io auth middleware
  io.use(async (socket, next) => {
    try {
      // Check auth object, then Authorization header, then cookies
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token && socket.handshake.headers?.cookie) {
        const cookieToken = socket.handshake.headers.cookie
          .split('; ')
          .find((c) => c.startsWith('token='))
          ?.split('=')[1];
        if (cookieToken) token = cookieToken;
      }

      if (!token) {
        console.log(
          '[Socket] Auth Failed: No token provided in auth, headers, or cookies',
        );
        return next(new Error('No token'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const member = await Member.findById(decoded.id).select('_id name');
      if (member) {
        socket.userId = member._id.toString();
        socket.userModel = 'Member';
      } else {
        const user = await User.findById(decoded.id).select('_id name');
        if (!user) return next(new Error('User not found'));
        socket.userId = user._id.toString();
        socket.userModel = 'User';
      }
      next();
    } catch (error) {
      console.log('[Socket] Auth Failed:', error.message);
      next(new Error('Invalid token'));
    }
  });

  // Track online users: Map<userId, { userModel, socketCount }>
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    // Join personal room for targeted events
    socket.join(`user_${socket.userId}`);
    console.log(`[Socket] ${socket.userModel} ${socket.userId} connected`);

    // Add to online set
    if (!onlineUsers.has(socket.userId)) {
      onlineUsers.set(socket.userId, { userModel: socket.userModel, count: 1 });
      // Broadcast to all other sockets that this user came online
      socket.broadcast.emit('user:online', {
        userId: socket.userId,
        userModel: socket.userModel,
      });
    } else {
      // Multiple tabs – just increment count
      onlineUsers.get(socket.userId).count++;
    }

    // Send the full online presence snapshot to the newly connected socket
    socket.emit(
      'user:presence_list',
      Array.from(onlineUsers.entries()).map(([id, data]) => ({
        userId: id,
        userModel: data.userModel,
      })),
    );

    socket.on('typing', ({ conversationId, receiverId }) => {
      socket.to(`user_${receiverId}`).emit('user:typing', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('stop-typing', ({ conversationId, receiverId }) => {
      socket.to(`user_${receiverId}`).emit('user:stop-typing', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('recording', ({ conversationId, receiverId }) => {
      socket.to(`user_${receiverId}`).emit('user:recording', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('stop-recording', ({ conversationId, receiverId }) => {
      socket.to(`user_${receiverId}`).emit('user:stop-recording', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ${socket.userModel} ${socket.userId} disconnected`);
      const entry = onlineUsers.get(socket.userId);
      if (entry) {
        entry.count--;
        if (entry.count <= 0) {
          onlineUsers.delete(socket.userId);
          // Broadcast offline to everyone
          io.emit('user:offline', {
            userId: socket.userId,
            userModel: socket.userModel,
          });
        }
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (on all interfaces)`);
    initFinanceFlow();
    initScheduledTasks();
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
