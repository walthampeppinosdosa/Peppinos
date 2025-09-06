const mongoose = require('mongoose');

// Add-on sub-schema
const addonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Add-on name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Add-on price is required'],
    min: [0, 'Add-on price cannot be negative']
  }
}, { _id: true });

// Image sub-schema
const imageSchema = new mongoose.Schema({
  public_id: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  width: Number,
  height: Number
}, { _id: true });

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
    maxlength: [100, 'Menu item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Menu item description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  images: {
    type: [imageSchema],
    required: [true, 'At least one image is required'],
    validate: {
      validator: function(images) {
        return images && images.length > 0;
      },
      message: 'At least one image is required'
    }
  },
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'MRP cannot be negative']
  },
  discountedPrice: {
    type: Number,
    required: [true, 'Discounted price is required'],
    min: [0, 'Discounted price cannot be negative'],
    validate: {
      validator: function(price) {
        return price <= this.mrp;
      },
      message: 'Discounted price cannot be greater than MRP'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  sizes: {
    type: [String],
    enum: ['Small', 'Medium', 'Large'],
    default: ['Medium']
  },
  isVegetarian: {
    type: Boolean,
    required: [true, 'Vegetarian status is required'],
    default: true
  },
  spicyLevel: {
    type: String,
    enum: ['Not Applicable', 'Mild', 'Medium', 'Hot', 'Extra Hot'],
    default: 'Not Applicable'
  },
  preparationTime: {
    type: Number,
    required: [true, 'Preparation time is required'],
    min: [1, 'Preparation time must be at least 1 minute'],
    default: 15
  },
  addons: {
    type: [addonSchema],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  specialInstructions: {
    type: String,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  averageRating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0
  },
  totalReviews: {
    type: Number,
    min: [0, 'Total reviews cannot be negative'],
    default: 0
  },
  totalSales: {
    type: Number,
    min: [0, 'Total sales cannot be negative'],
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
menuSchema.index({ name: 'text', description: 'text' });
menuSchema.index({ category: 1 });
menuSchema.index({ isVegetarian: 1 });
menuSchema.index({ isActive: 1 });
menuSchema.index({ isAvailable: 1 });
menuSchema.index({ featured: 1 });
menuSchema.index({ averageRating: -1 });
menuSchema.index({ totalSales: -1 });
menuSchema.index({ createdAt: -1 });
menuSchema.index({ sortOrder: 1 });

// Virtual for discount percentage
menuSchema.virtual('discountPercentage').get(function() {
  if (this.mrp > 0) {
    return Math.round(((this.mrp - this.discountedPrice) / this.mrp) * 100);
  }
  return 0;
});

// Virtual for availability status
menuSchema.virtual('availabilityStatus').get(function() {
  if (!this.isActive) return 'inactive';
  if (!this.isAvailable) return 'unavailable';
  if (this.quantity <= 0) return 'out_of_stock';
  return 'available';
});

// Pre-save middleware
menuSchema.pre('save', function(next) {
  // Ensure discounted price is not greater than MRP
  if (this.discountedPrice > this.mrp) {
    this.discountedPrice = this.mrp;
  }
  next();
});

// Static methods
menuSchema.statics.findByCategory = function(categoryId) {
  return this.find({ category: categoryId, isActive: true });
};

menuSchema.statics.findVegetarian = function() {
  return this.find({ isVegetarian: true, isActive: true });
};

menuSchema.statics.findNonVegetarian = function() {
  return this.find({ isVegetarian: false, isActive: true });
};

menuSchema.statics.findFeatured = function() {
  return this.find({ featured: true, isActive: true });
};

menuSchema.statics.findAvailable = function() {
  return this.find({ isAvailable: true, isActive: true, quantity: { $gt: 0 } });
};

// Instance methods
menuSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.averageRating * this.totalReviews) + newRating;
  this.totalReviews += 1;
  this.averageRating = totalRating / this.totalReviews;
  return this.save();
};

menuSchema.methods.incrementSales = function(quantity = 1) {
  this.totalSales += quantity;
  return this.save();
};

menuSchema.methods.updateStock = function(quantity) {
  this.quantity = Math.max(0, this.quantity + quantity);
  this.isAvailable = this.quantity > 0;
  return this.save();
};

const Menu = mongoose.model('Menu', menuSchema);

module.exports = Menu;
