const mongoose = require('mongoose');

const preparationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Preparation name is required'],
    trim: true,
    maxlength: [50, 'Preparation name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
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
preparationSchema.index({ parentCategory: 1, isActive: 1 });
preparationSchema.index({ name: 1, parentCategory: 1 }, { unique: true });

// Instance methods
preparationSchema.methods.toJSON = function() {
  const preparation = this.toObject();
  return preparation;
};

// Static methods
preparationSchema.statics.findByParentCategory = function(parentCategoryId) {
  return this.find({ 
    parentCategory: parentCategoryId, 
    isActive: true 
  }).sort({ sortOrder: 1, name: 1 });
};

preparationSchema.statics.findActivePreparations = function() {
  return this.find({ isActive: true })
    .populate('parentCategory', 'name isVegetarian')
    .sort({ sortOrder: 1, name: 1 });
};

module.exports = mongoose.model('Preparation', preparationSchema);
