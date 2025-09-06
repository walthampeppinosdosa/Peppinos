const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  category: {
    type: String,
    enum: ['food_quality', 'service', 'delivery', 'app_experience', 'pricing', 'other'],
    required: [true, 'Feedback category is required']
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
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Feedback message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'addressed', 'closed'],
    default: 'new'
  },
  adminResponse: {
    text: {
      type: String,
      trim: true
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ order: 1 });

// Method to add admin response
feedbackSchema.methods.addResponse = function(responseText, adminId) {
  this.adminResponse = {
    text: responseText,
    respondedBy: adminId,
    respondedAt: new Date()
  };
  this.status = 'addressed';
  return this.save();
};

// Static method to get feedback statistics
feedbackSchema.statics.getFeedbackStats = function(startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        categoryBreakdown: {
          $push: {
            category: '$category',
            rating: '$rating'
          }
        }
      }
    },
    {
      $unwind: '$categoryBreakdown'
    },
    {
      $group: {
        _id: {
          category: '$categoryBreakdown.category'
        },
        count: { $sum: 1 },
        averageRating: { $avg: '$categoryBreakdown.rating' },
        totalFeedback: { $first: '$totalFeedback' },
        overallAverageRating: { $first: '$averageRating' }
      }
    }
  ]);
};

module.exports = mongoose.model('Feedback', feedbackSchema);
