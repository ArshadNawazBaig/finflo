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
  'https://app.finflo.org',
  'https://finflo.org',
];

// Pin Vercel previews to a specific project — the previous regex allowed any
// `*.vercel.app` host to call the API with credentials, which let an attacker
// who hosts on Vercel pivot to authenticated CSRF.
const VERCEL_PROJECT_HOSTS = [
  /^https:\/\/finflo-client(-[a-z0-9-]+)?\.vercel\.app$/,
  /^https:\/\/loan-master-client(-[a-z0-9-]+)?\.vercel\.app$/,
];

const corsOptions = {
  origin: (origin, callback) => {
    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      VERCEL_PROJECT_HOSTS.some((re) => re.test(origin)) ||
      /^https:\/\/finflo-production\.up\.railway\.app$/.test(origin) ||
      /^https:\/\/(.*\.)?finflo\.org$/.test(origin) ||
      (process.env.NODE_ENV !== 'production' &&
        (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(
            origin,
          )));

    if (isAllowed) {
      callback(null, true);
    } else {
      // Log only blocked origins — successful requests are a per-request firehose
      // that reveals the allowlist to anyone reading logs.
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
    'x-transaction-token',
    'Sec-Ch-Ua',
    'Sec-Ch-Ua-Mobile',
    'Sec-Ch-Ua-Platform',
  ],
  exposedHeaders: ['set-cookie'],
  credentials: true,
  preflightContinue: true,
  optionsSuccessStatus: 204,
};

const helmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // SECURITY: scripts must come from known origins only — removed
      // 'unsafe-inline' which defeated CSP's primary XSS-mitigation value.
      scriptSrc: ["'self'", 'https://accounts.google.com', 'https://apis.google.com', 'https://js.stripe.com'],
      // 'unsafe-inline' for styles is kept because Tailwind+CSS-in-JS leaves
      // inline styles in the bundle; that is a much smaller risk than inline
      // scripts. Migrate to nonces later if you want full lockdown.
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      // 'blob:' is required for client-side image previews (URL.createObjectURL),
      // e.g. the logo upload preview before the file is sent to Cloudinary.
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://accounts.google.com',
        'https://play.google.com',
        ...(process.env.NODE_ENV === 'production'
          ? []
          : [
              'http://localhost:5174',
              'http://localhost:*',
              'http://127.0.0.1:*',
              'http://192.168.*.*:*',
              'ws://localhost:*',
              'ws://127.0.0.1:*',
            ]),
        // wss:// pinned to known socket origins instead of wildcard
        'wss://finflo-production.up.railway.app',
        'wss://app.finflo.org',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://accounts.google.com'],
      frameAncestors: ["'none'"], // clickjacking defence
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per 15 min window
  message: {
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for OTP / 2FA / PIN verification — 10⁶ codes is brute-forceable
// without this. 8 attempts per 15-minute window per IP.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: {
    message: 'Too many verification attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for signup / password-reset request — prevents email-bomb / enumeration.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    message: 'Too many signup or password-reset requests. Try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  corsMiddleware: cors(corsOptions),
  corsOptions,
  helmetMiddleware: helmet(helmetOptions),
  apiLimiter,
  authLimiter,
  otpLimiter,
  signupLimiter,
};
