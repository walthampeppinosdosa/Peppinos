const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

// Rate limiting removed - was causing issues in development and production

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
      'https://admin.socket.io',
      // Firebase hosting URLs
      'https://walthampeppinos.web.app',
      'https://peppinos-admin.web.app'
    ];


    
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
