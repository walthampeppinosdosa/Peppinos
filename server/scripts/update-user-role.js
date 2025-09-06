const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peppinos-restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateUserRole() {
  try {
    const result = await User.updateOne(
      { email: 'admin@test.com' },
      { role: 'super-admin' }
    );
    
    console.log('User role updated:', result);
    
    const user = await User.findOne({ email: 'admin@test.com' });
    console.log('Updated user:', user);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating user role:', error);
    process.exit(1);
  }
}

updateUserRole();
