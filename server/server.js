const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { corsOptions, helmetConfig, mongoSanitize, generalLimiter, authLimiter, adminApiLimiter } = require('./middleware/security-middleware');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(mongoSanitize);

// CORS configuration - Use the comprehensive CORS options
app.use(cors(corsOptions));

// Rate limiting
app.use('/api/', generalLimiter);

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Serverless database connection middleware
const ensureDatabaseConnection = async (req, res, next) => {
  // Skip database check for health endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  try {
    // Ensure database connection for each request in serverless
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 Establishing database connection for request...');
      await connectToDatabase();
    }
    next();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again.',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Serverless-optimized MongoDB connection
const mongoOptions = {
  serverSelectionTimeoutMS: 5000, // Reduced for serverless
  socketTimeoutMS: 10000, // Reduced for serverless
  connectTimeoutMS: 5000, // Reduced for serverless
  maxPoolSize: 1, // Single connection for serverless
  minPoolSize: 0, // No minimum for serverless
  maxIdleTimeMS: 10000, // Shorter idle time
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 30000, // Less frequent heartbeat
};

// Disable mongoose buffering for serverless
mongoose.set('bufferCommands', false);

// Global connection promise to avoid multiple connections
let cachedConnection = null;

// Serverless-optimized connection function
async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    cachedConnection = mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    await cachedConnection;
    return cachedConnection;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    cachedConnection = null; // Reset on error
    throw err;
  }
}

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database health check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Enhanced debugging information
    const debugInfo = {
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriLength: process.env.MONGODB_URI?.length || 0,
      mongoUriStart: process.env.MONGODB_URI?.substring(0, 30) || 'Not found',
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      nodeVersion: process.version,
      mongooseVersion: require('mongoose/package.json').version
    };

    if (dbState === 1) {
      res.status(200).json({
        status: 'OK',
        message: "Peppino's Restaurant API is running",
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          state: dbStates[dbState],
          host: mongoose.connection.host,
          name: mongoose.connection.name
        },
        debug: debugInfo,
        environment: process.env.NODE_ENV || 'development'
      });
    } else {
      res.status(503).json({
        status: 'ERROR',
        message: 'Database connection issue',
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
          state: dbStates[dbState]
        },
        debug: debugInfo,
        environment: process.env.NODE_ENV || 'development'
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'error',
        state: mongoose.connection.readyState
      },
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Apply database connection middleware to all API routes (with async wrapper)
app.use('/api', (req, res, next) => {
  ensureDatabaseConnection(req, res, next).catch(next);
});

// Routes
app.use('/api/auth', authLimiter);
app.use('/api/auth', require('./routes/auth/auth-routes'));
app.use('/api/admin', adminApiLimiter); // Apply admin rate limiting to all admin routes
app.use('/api/admin/menu', require('./routes/admin/menu-routes')); // New menu routes
app.use('/api/admin', require('./routes/admin/category-routes'));
app.use('/api/admin', require('./routes/admin/order-routes'));
app.use('/api/admin', require('./routes/admin/user-routes'));
app.use('/api/admin/dashboard', require('./routes/admin/dashboard-routes'));
app.use('/api/admin/reports', require('./routes/admin/reports-routes'));
app.use('/api/admin/preparations', require('./routes/admin/preparation-routes'));
app.use('/api/admin/spicy-levels', require('./routes/admin/spicy-level-routes'));
// Guest routes must come before other shop routes to avoid authentication conflicts
app.use('/api/shop/guest', require('./routes/shop/guest-routes'));
app.use('/api/shop', require('./routes/shop/menu-routes'));
app.use('/api/shop', require('./routes/shop/cart-routes'));
app.use('/api/shop', require('./routes/shop/order-routes'));
app.use('/api/shop', require('./routes/shop/address-routes'));
app.use('/api/shop', require('./routes/shop/review-routes'));
app.use('/api/user', require('./routes/shop/user-routes'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5001;

// For local development, start the server
if (process.env.NODE_ENV !== 'production') {
  // Start server only after database connection is established
  async function startServer() {
    try {
      // Wait for database connection
      await connectToDatabase();

      // Start the server only after successful database connection
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      // Retry connection after 5 seconds
      setTimeout(() => {
        startServer();
      }, 5000);
    }
  }

  // Start the server for local development
  startServer();
}

module.exports = app;
