const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: [true, 'Menu item is required']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Review title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Review comment must be at least 10 characters'],
    maxlength: [1000, 'Review comment cannot exceed 1000 characters']
  },
  images: [{
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  }],
  isApproved: {
    type: Boolean,
    default: false
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    trim: true
  },
  moderatorNotes: {
    type: String,
    trim: true
  },
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  verifiedPurchase: {
    type: Boolean,
    default: true
  },
  response: {
    text: {
      type: String,
      trim: true,
      maxlength: [500, 'Response cannot exceed 500 characters']
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ menu: 1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ menu: 1, isApproved: 1 });

// Compound index to ensure one review per user per menu per order
// This also covers queries on user field, so no separate user index needed
reviewSchema.index({ user: 1, menu: 1, order: 1 }, { unique: true });

// Post-save middleware to update menu rating
reviewSchema.post('save', async function() {
  if (this.isApproved) {
    await this.updateMenuRating();
  }
});

// Post-remove middleware to update menu rating
reviewSchema.post('remove', async function() {
  await this.updateMenuRating();
});

// Method to update menu average rating
reviewSchema.methods.updateMenuRating = async function() {
  const Menu = mongoose.model('Menu');

  const stats = await this.constructor.aggregate([
    {
      $match: {
        menu: this.menu,
        isApproved: true
      }
    },
    {
      $group: {
        _id: '$menu',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Menu.findByIdAndUpdate(this.menu, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews
    });
  } else {
    await Menu.findByIdAndUpdate(this.menu, {
      averageRating: 0,
      totalReviews: 0
    });
  }
};

// Method to approve review
reviewSchema.methods.approve = async function() {
  this.isApproved = true;
  await this.save();
  return this;
};

// Method to reject review
reviewSchema.methods.reject = async function(reason) {
  this.isApproved = false;
  this.moderatorNotes = reason;
  await this.save();
  return this;
};

// Method to add response
reviewSchema.methods.addResponse = async function(responseText, responderId) {
  this.response = {
    text: responseText,
    respondedBy: responderId,
    respondedAt: new Date()
  };
  await this.save();
  return this;
};

// Static method to get menu reviews
reviewSchema.statics.getMenuReviews = function(menuId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = -1,
    rating = null
  } = options;

  const query = { menu: menuId, isApproved: true };
  if (rating) {
    query.rating = rating;
  }

  return this.find(query)
    .populate('user', 'name profileImage')
    .populate('response.respondedBy', 'name')
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to get review statistics for a menu
reviewSchema.statics.getMenuReviewStats = function(menuId) {
  return this.aggregate([
    {
      $match: {
        menu: mongoose.Types.ObjectId(menuId),
        isApproved: true
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ]);
};

module.exports = mongoose.model('Review', reviewSchema);
