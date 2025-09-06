const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
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
reviewSchema.index({ product: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ product: 1, isApproved: 1 });

// Compound index to ensure one review per user per product per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Post-save middleware to update product rating
reviewSchema.post('save', async function() {
  if (this.isApproved) {
    await this.updateProductRating();
  }
});

// Post-remove middleware to update product rating
reviewSchema.post('remove', async function() {
  await this.updateProductRating();
});

// Method to update product average rating
reviewSchema.methods.updateProductRating = async function() {
  const Product = mongoose.model('Product');

  const stats = await this.constructor.aggregate([
    {
      $match: {
        product: this.product,
        isApproved: true
      }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(this.product, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews
    });
  } else {
    await Product.findByIdAndUpdate(this.product, {
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

// Static method to get product reviews
reviewSchema.statics.getProductReviews = function(productId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = -1,
    rating = null
  } = options;

  const query = { product: productId, isApproved: true };
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

// Static method to get review statistics for a product
reviewSchema.statics.getProductReviewStats = function(productId) {
  return this.aggregate([
    {
      $match: {
        product: mongoose.Types.ObjectId(productId),
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
