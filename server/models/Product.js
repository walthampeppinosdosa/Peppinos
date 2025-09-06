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

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
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
    validate: {
      validator: function(images) {
        return images && images.length > 0 && images.length <= 5;
      },
      message: 'Product must have between 1 and 5 images'
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
  spicyLevel: {
    type: String,
    enum: ['Mild', 'Medium', 'Hot', 'Extra Hot', 'Not Applicable'],
    default: 'Not Applicable'
  },
  preparationTime: {
    type: Number, // in minutes
    required: [true, 'Preparation time is required'],
    min: [1, 'Preparation time must be at least 1 minute'],
    max: [120, 'Preparation time cannot exceed 120 minutes']
  },
  addons: {
    type: [addonSchema],
    default: []
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVegetarian: {
    type: Boolean,
    required: [true, 'Vegetarian status is required']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: {
    type: [String],
    default: []
  },
  nutritionalInfo: {
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fat: { type: Number, min: 0 },
    fiber: { type: Number, min: 0 }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isVegetarian: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ discountedPrice: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.mrp > 0) {
    return Math.round(((this.mrp - this.discountedPrice) / this.mrp) * 100);
  }
  return 0;
});

// Virtual for availability status
productSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.quantity > 0;
});

// Ensure virtuals are included in JSON output
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
