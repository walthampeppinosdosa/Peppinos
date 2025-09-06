const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
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
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    enum: ['website', 'app', 'social', 'referral'],
    default: 'website'
  },
  preferences: {
    promotions: {
      type: Boolean,
      default: true
    },
    newMenus: {
      type: Boolean,
      default: true
    },
    events: {
      type: Boolean,
      default: true
    }
  },
  unsubscribedAt: {
    type: Date
  },
  unsubscribeReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ isActive: 1 });
newsletterSchema.index({ createdAt: -1 });

// Method to unsubscribe
newsletterSchema.methods.unsubscribe = function(reason) {
  this.isActive = false;
  this.unsubscribedAt = new Date();
  this.unsubscribeReason = reason;
  return this.save();
};

// Method to resubscribe
newsletterSchema.methods.resubscribe = function() {
  this.isActive = true;
  this.unsubscribedAt = undefined;
  this.unsubscribeReason = undefined;
  return this.save();
};

// Static method to get active subscribers
newsletterSchema.statics.getActiveSubscribers = function() {
  return this.find({ isActive: true }).select('email name preferences');
};

module.exports = mongoose.model('Newsletter', newsletterSchema);
