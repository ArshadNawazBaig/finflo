const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// restrict CORS to CLIENT_URL and known allowed origins
const productionUrl =
  process.env.CLIENT_URL || 'https://loan-master-client.vercel.app';

const allowedOrigins = [
  productionUrl,
  'https://loan-master-client.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'capacitor://localhost',
  'http://localhost',
  'https://finflo-production.up.railway.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (origin && process.env.NODE_ENV !== 'production')
      console.log(`CORS request from: ${origin} | Allowed: ${productionUrl}`);

    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      /^https:\/\/[a-z0-9-]+(\.vercel\.app)$/.test(origin) ||
      /^https:\/\/[a-z0-9-]+(\.up\.railway\.app)$/.test(origin) ||
      (process.env.NODE_ENV !== 'production' &&
        (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(
            origin,
          )));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`CORS BLOCKED: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Cookie',
    'cookie',
  ],
  exposedHeaders: ['set-cookie'],
  credentials: true,
  optionsSuccessStatus: 200,
};

const helmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com', 'https://apis.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'http://localhost:5174',
        'http://localhost:*',
        'http://127.0.0.1:*',
        'http://192.168.*.*:*',
        'ws://localhost:*',
        'ws://127.0.0.1:*',
        'wss://*',
        'https://accounts.google.com',
        'https://play.google.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://accounts.google.com'],
    },
  },
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  message: {
    message: 'Too many authentication attempts, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  corsMiddleware: cors(corsOptions),
  helmetMiddleware: helmet(helmetOptions),
  apiLimiter,
  authLimiter,
};
