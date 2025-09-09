const mongoose = require('mongoose');

const spicyLevelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Spicy level name is required'],
    trim: true,
    maxlength: [30, 'Spicy level name cannot exceed 30 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  level: {
    type: Number,
    required: [true, 'Spicy level number is required'],
    min: [0, 'Level cannot be negative'],
    max: [10, 'Level cannot exceed 10']
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Parent category is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
spicyLevelSchema.index({ parentCategory: 1, isActive: 1 });
spicyLevelSchema.index({ name: 1, parentCategory: 1 }, { unique: true });
spicyLevelSchema.index({ level: 1, parentCategory: 1 });

// Instance methods
spicyLevelSchema.methods.toJSON = function() {
  const spicyLevel = this.toObject();
  return spicyLevel;
};

// Static methods
spicyLevelSchema.statics.findByParentCategory = function(parentCategoryId) {
  return this.find({ 
    parentCategory: parentCategoryId, 
    isActive: true 
  }).sort({ level: 1, sortOrder: 1 });
};

spicyLevelSchema.statics.findActiveSpicyLevels = function() {
  return this.find({ isActive: true })
    .populate('parentCategory', 'name isVegetarian')
    .sort({ level: 1, sortOrder: 1 });
};

module.exports = mongoose.model('SpicyLevel', spicyLevelSchema);
