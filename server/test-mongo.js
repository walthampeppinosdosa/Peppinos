const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testing MongoDB Connection...');
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI (masked):', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'));

const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
};

// Disable mongoose buffering for better error handling
mongoose.set('bufferCommands', false);

async function testConnection() {
  try {
    console.log('⏳ Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Connection details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState
    });

    // Test a simple operation
    console.log('🔍 Testing database ping...');
    const adminDb = mongoose.connection.db.admin();
    const pingResult = await adminDb.ping();
    console.log('✅ Database ping successful:', pingResult);

    // Test user collection access
    console.log('🔍 Testing collection access...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));

    await mongoose.connection.close();
    console.log('🔌 Connection closed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName
    });
    process.exit(1);
  }
}

testConnection();
