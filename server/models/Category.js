const mongoose = require('mongoose');

// Image sub-schema for category
const categoryImageSchema = new mongoose.Schema({
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
}, { _id: false });

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Category description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: categoryImageSchema,
    required: [true, 'Category image is required']
  },
  isVegetarian: {
    type: Boolean,
    required: [true, 'Vegetarian status is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  productCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes (name and slug already have unique indexes from schema definition)
categorySchema.index({ isVegetarian: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Static method to get categories with product counts
categorySchema.statics.getWithProductCounts = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'category',
        as: 'products'
      }
    },
    {
      $addFields: {
        productCount: { $size: '$products' }
      }
    },
    {
      $project: {
        products: 0
      }
    },
    {
      $sort: { sortOrder: 1, name: 1 }
    }
  ]);
};

// Virtual for active products count
categorySchema.virtual('activeProductCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true,
  match: { isActive: true }
});

module.exports = mongoose.model('Category', categorySchema);
