const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const slowDown = require('express-slow-down');

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// General rate limit - disabled in development
const generalLimiter = process.env.NODE_ENV === 'development'
  ? (req, res, next) => next() // Skip rate limiting in development
  : createRateLimit(
      15 * 60 * 1000, // 15 minutes
      100, // limit each IP to 100 requests per windowMs
      'Too many requests from this IP, please try again later.'
    );

// Auth rate limit (stricter) - disabled in development
const authLimiter = process.env.NODE_ENV === 'development'
  ? (req, res, next) => {
      console.log('🔓 Auth rate limiting disabled in development');
      next();
    } // Skip rate limiting in development
  : createRateLimit(
      15 * 60 * 1000, // 15 minutes
      5, // limit each IP to 5 requests per windowMs
      'Too many authentication attempts, please try again later.',
      true // Skip successful requests
    );

// Password reset rate limit - disabled in development
const passwordResetLimiter = process.env.NODE_ENV === 'development'
  ? (req, res, next) => next() // Skip rate limiting in development
  : createRateLimit(
      60 * 60 * 1000, // 1 hour
      3, // limit each IP to 3 password reset requests per hour
      'Too many password reset attempts, please try again later.'
    );

// API rate limit
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000, // limit each IP to 1000 requests per windowMs
  'API rate limit exceeded, please try again later.'
);

// Admin API rate limit (more restrictive)
const adminApiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 2000 : 500, // Higher limit for development
  'Admin API rate limit exceeded, please try again later.'
);

// File upload rate limit
const uploadLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // limit each IP to 20 uploads per windowMs
  'Too many file uploads, please try again later.'
);

// Speed limiter for suspicious activity
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  }, // add 500ms delay per request after delayAfter (v2 compatible)
  maxDelayMs: 20000, // maximum delay of 20 seconds
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      process.env.ADMIN_URL,
      'http://localhost:3000',
      'http://localhost:5500',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:8081',
      // Firebase hosting URLs
      'https://walthampeppinos.web.app',
      'https://peppinos-admin.web.app'
    ];

    // Debug logging for CORS issues
    console.log('🔍 CORS Debug:', {
      origin,
      allowedOrigins,
      CLIENT_URL: process.env.CLIENT_URL,
      ADMIN_URL: process.env.ADMIN_URL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    // Allow requests with no origin (like mobile apps, curl requests, or direct API access)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Helmet configuration for enhanced security
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.cloudinary.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// IP whitelist middleware for admin routes
const ipWhitelist = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address'
      });
    }
  }
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // Log suspicious activity
    if (res.statusCode >= 400 || duration > 5000) {
      console.warn('Suspicious request:', logData);
    }
  });
  
  next();
};

// Input validation middleware
const validateInput = (req, res, next) => {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  next();
};

// API key validation middleware
const validateApiKey = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing API key'
      });
    }
  }
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  adminApiLimiter,
  uploadLimiter,
  speedLimiter,
  corsOptions,
  helmetConfig,
  securityHeaders,
  ipWhitelist,
  requestLogger,
  validateInput,
  validateApiKey,
  mongoSanitize: mongoSanitize(),
  xssClean: xss(),
  hpp: hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'search']
  })
};
