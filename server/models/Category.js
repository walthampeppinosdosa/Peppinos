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
    required: function() {
      return this.type === 'menu'; // Only menu categories require images
    }
  },
  type: {
    type: String,
    enum: ['parent', 'menu'],
    required: [true, 'Category type is required'],
    default: 'menu'
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function() {
      return this.type === 'menu'; // Menu categories must have a parent
    }
  },
  isVegetarian: {
    type: Boolean,
    required: function() {
      return this.type === 'parent'; // Only parent categories need this field
    }
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
    lowercase: true
  },
  menuItemCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isVegetarian: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ type: 1 });
categorySchema.index({ parentCategory: 1 });
// Compound unique index for name within parent category
categorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });

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

// Static method to get categories with menu item counts
categorySchema.statics.getWithMenuItemCounts = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'menus',
        localField: '_id',
        foreignField: 'category',
        as: 'menuItems'
      }
    },
    {
      $addFields: {
        menuItemCount: { $size: '$menuItems' }
      }
    },
    {
      $project: {
        menuItems: 0
      }
    },
    {
      $sort: { sortOrder: 1, name: 1 }
    }
  ]);
};

// Static method to get hierarchical category structure
categorySchema.statics.getHierarchical = function() {
  return this.aggregate([
    {
      $match: { type: 'parent' }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: 'parentCategory',
        as: 'menuCategories'
      }
    },
    {
      $lookup: {
        from: 'menus',
        localField: 'menuCategories._id',
        foreignField: 'category',
        as: 'menuItems'
      }
    },
    {
      $addFields: {
        menuItemCount: { $size: '$menuItems' },
        'menuCategories.menuItemCount': {
          $map: {
            input: '$menuCategories',
            as: 'menuCat',
            in: {
              $mergeObjects: [
                '$$menuCat',
                {
                  menuItemCount: {
                    $size: {
                      $filter: {
                        input: '$menuItems',
                        cond: { $eq: ['$$this.category', '$$menuCat._id'] }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    },
    {
      $project: {
        menuItems: 0
      }
    },
    {
      $sort: { sortOrder: 1, name: 1 }
    }
  ]);
};

// Static method to get menu categories for a specific parent
categorySchema.statics.getMenuCategoriesByParent = function(parentId) {
  return this.find({
    type: 'menu',
    parentCategory: parentId,
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

// Virtual for active menu items count
categorySchema.virtual('activeMenuItemCount', {
  ref: 'Menu',
  localField: '_id',
  foreignField: 'category',
  count: true,
  match: { isActive: true }
});

module.exports = mongoose.model('Category', categorySchema);
