const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { corsOptions, helmetConfig, mongoSanitize } = require('./middleware/security-middleware');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmetConfig);
app.use(mongoSanitize);

// CORS configuration - Use the comprehensive CORS options
app.use(cors(corsOptions));

// Rate limiting removed - causing issues in development

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

    // Show success message only in local development
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MongoDB connected successfully');
      console.log('📊 Connection details:', {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      });
    }

    return cachedConnection;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    cachedConnection = null; // Reset on error
    throw err;
  }
}

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔗 Mongoose connected to MongoDB');
  }
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔌 Mongoose disconnected from MongoDB');
  }
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
app.use('/api/auth', require('./routes/auth/auth-routes'));
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

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://peppinos-admin.web.app", "https://walthampeppinos.web.app"]
      : ["http://localhost:3000", "http://localhost:5173", "http://localhost:4173", "https://admin.socket.io"],
    methods: ["GET", "POST"],
    credentials: true
  },
  // Railway supports WebSockets - use both transports
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6
});

// Socket.IO middleware for authentication
const jwt = require('jsonwebtoken');
const User = require('./models/User');

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token ||
                  socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                  socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId; // Support both formats

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Check if user is admin (support both formats)
    const adminRoles = ['superadmin', 'super-admin', 'veg_admin', 'non_veg_admin'];
    if (!adminRoles.includes(user.role)) {
      return next(new Error('Authentication error: Insufficient permissions'));
    }

    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.userName = user.name;

    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Join admin room based on role
  const adminRoom = socket.userRole === 'superadmin' ? 'admin:all' : `admin:${socket.userRole}`;
  socket.join(adminRoom);
  socket.join(`user:${socket.userId}`); // Personal room for user-specific events

  // Handle admin-specific events
  socket.on('joinAdminRoom', () => {
    // Already handled in middleware, but we can send confirmation
    socket.emit('adminRoomJoined', {
      room: adminRoom,
      role: socket.userRole,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('leaveAdminRoom', () => {
    socket.leave(adminRoom);
  });

  socket.on('requestOrderUpdate', (orderId) => {
    // This could trigger a fresh order fetch if needed
    socket.emit('orderUpdateRequested', { orderId, timestamp: new Date().toISOString() });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    // Connection closed
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Export io instance for use in other modules
global.io = io;

const PORT = process.env.PORT || 5001;

// For local development, start the server
if (process.env.NODE_ENV !== 'production') {
  // Start server only after database connection is established
  async function startServer() {
    try {
      // Wait for database connection
      await connectToDatabase();

      // Start the server only after successful database connection
      server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔌 Socket.IO server ready`);
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
