const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  label: {
    type: String,
    trim: true,
    maxlength: [50, 'Label cannot exceed 50 characters']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
  },
  apartment: {
    type: String,
    trim: true,
    maxlength: [50, 'Apartment/Unit cannot exceed 50 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true,
    match: [/^\d{5}(-\d{4})?$/, 'Please provide a valid ZIP code']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    default: 'United States',
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  deliveryInstructions: {
    type: String,
    trim: true,
    maxlength: [300, 'Delivery instructions cannot exceed 300 characters']
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
// Compound indexes cover user queries, so no separate user index needed
addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, isActive: 1 });

// Ensure only one default address per user
addressSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default flag from other addresses of the same user
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Virtual for formatted address
addressSchema.virtual('formattedAddress').get(function() {
  let address = this.street;
  if (this.apartment) {
    address += `, ${this.apartment}`;
  }
  address += `, ${this.city}, ${this.state} ${this.zipCode}`;
  if (this.country !== 'United States') {
    address += `, ${this.country}`;
  }
  return address;
});

// Virtual for short address
addressSchema.virtual('shortAddress').get(function() {
  return `${this.city}, ${this.state} ${this.zipCode}`;
});

// Method to set as default
addressSchema.methods.setAsDefault = async function() {
  // Remove default flag from other addresses
  await this.constructor.updateMany(
    { user: this.user, _id: { $ne: this._id } },
    { $set: { isDefault: false } }
  );

  // Set this address as default
  this.isDefault = true;
  return this.save();
};

// Static method to get user's default address
addressSchema.statics.getDefaultAddress = function(userId) {
  return this.findOne({ user: userId, isDefault: true, isActive: true });
};

// Static method to get user's addresses
addressSchema.statics.getUserAddresses = function(userId) {
  return this.find({ user: userId, isActive: true })
    .sort({ isDefault: -1, createdAt: -1 });
};

// Ensure virtuals are included in JSON output
addressSchema.set('toJSON', { virtuals: true });
addressSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Address', addressSchema);
