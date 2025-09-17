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

// Database connection with proper timeout and retry options
const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds (increased from default 10s)
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain a minimum of 5 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  retryWrites: true, // Retry writes on failure
  retryReads: true, // Retry reads on failure
  heartbeatFrequencyMS: 10000, // Check server status every 10 seconds
};

// Disable mongoose buffering for better error handling
mongoose.set('bufferCommands', false);

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📊 Connection details:', {
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    readyState: mongoose.connection.readyState
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  console.error('🔍 Connection string (masked):', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'));
  process.exit(1); // Exit if database connection fails
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err);
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
app.get('/api/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    if (dbState === 1) {
      // Test a simple database operation
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();

      res.status(200).json({
        status: 'OK',
        message: "Peppino's Restaurant API is running",
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          state: dbStates[dbState],
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          ping: result
        },
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

// Test email endpoint (for debugging)
app.get('/test-email', async (req, res) => {
  try {
    const { sendEmail } = require('./helpers/send-email');

    await sendEmail({
      to: 'walthampeppinosdosa@gmail.com',
      subject: 'Test Email - Peppinos System',
      html: `
        <h2>Email Test</h2>
        <p>This is a test email to verify the email service is working.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Peppino\'s Restaurant API is running',
    timestamp: new Date().toISOString()
  });
});

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
