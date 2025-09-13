const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.kindeId && this.role !== 'guest'; // Password not required for OAuth users or guests
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, 'City cannot exceed 50 characters']
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  role: {
    type: String,
    enum: ['super-admin', 'veg-admin', 'non-veg-admin', 'customer', 'guest'],
    default: 'customer'
  },
  googleId: {
    type: String,
    sparse: true // Allows multiple null values but unique non-null values
  },
  kindeId: {
    type: String,
    sparse: true // Allows multiple null values but unique non-null values
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'kinde'],
    default: 'local'
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String // URL to profile image
  },
  // Session ID for guest users
  sessionId: {
    type: String,
    required: function() {
      return this.role === 'guest';
    },
    sparse: true // Allows multiple null values but unique non-null values
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  lastPasswordChange: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance (email and googleId already have unique indexes)
userSchema.index({ role: 1 });
// sessionId index is automatically created by sparse: true option

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user without sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  return user;
};

// Static method to find user by email or googleId
userSchema.statics.findByEmailOrGoogleId = function(email, googleId) {
  const query = { $or: [{ email }] };
  if (googleId) {
    query.$or.push({ googleId });
  }
  return this.findOne(query);
};

module.exports = mongoose.model('User', userSchema);
