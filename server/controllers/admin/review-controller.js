const Review = require('../../models/Review');
const Product = require('../../models/Product');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

/**
 * Get all reviews with filtering and pagination
 * GET /api/admin/reviews
 */
const getAllReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      rating = '',
      productId = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Search filter (by user name, product name, or review content)
    if (search) {
      const users = await User.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');

      const products = await Product.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');

      const userIds = users.map(user => user._id);
      const productIds = products.map(product => product._id);

      query.$or = [
        { user: { $in: userIds } },
        { product: { $in: productIds } },
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      if (status === 'approved') {
        query.isApproved = true;
      } else if (status === 'pending') {
        query.isApproved = false;
      }
    }

    // Rating filter
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Product filter
    if (productId) {
      query.product = productId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const reviews = await Review.find(query)
      .populate('user', 'name email profileImage')
      .populate('product', 'name images')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reviews',
      error: error.message
    });
  }
};

/**
 * Get single review by ID
 * GET /api/admin/reviews/:id
 */
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('user', 'name email profileImage phoneNumber')
      .populate('product', 'name images category')
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review retrieved successfully',
      data: { review }
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve review',
      error: error.message
    });
  }
};

/**
 * Approve/reject review
 * PUT /api/admin/reviews/:id/moderate
 */
const moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, moderatorNote } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isApproved = action === 'approve';
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    if (moderatorNote) {
      review.moderatorNote = moderatorNote;
    }

    await review.save();

    // Update product rating if approved
    if (action === 'approve') {
      await review.updateProductRating();
    }

    // Populate for response
    await review.populate('user', 'name email');
    await review.populate('product', 'name');

    res.status(200).json({
      success: true,
      message: `Review ${action}d successfully`,
      data: { review }
    });
  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate review',
      error: error.message
    });
  }
};

/**
 * Delete review
 * DELETE /api/admin/reviews/:id
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await Review.findByIdAndDelete(id);

    // Update product rating after deletion
    await review.updateProductRating();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    });
  }
};

/**
 * Get review statistics
 * GET /api/admin/reviews/stats
 */
const getReviewStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get overall statistics
    const stats = await Review.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          approvedReviews: {
            $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] }
          },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ['$isApproved', false] }, 1, 0] }
          },
          averageRating: { $avg: '$rating' },
          fiveStarReviews: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
          },
          fourStarReviews: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
          },
          threeStarReviews: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
          },
          twoStarReviews: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
          },
          oneStarReviews: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
          }
        }
      }
    ]);

    // Get top reviewed products
    const topProducts = await Review.aggregate([
      { $match: { ...dateFilter, isApproved: true } },
      {
        $group: {
          _id: '$product',
          reviewCount: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          reviewCount: 1,
          averageRating: { $round: ['$averageRating', 1] }
        }
      },
      { $sort: { reviewCount: -1 } },
      { $limit: 10 }
    ]);

    // Get recent reviews
    const recentReviews = await Review.find(dateFilter)
      .populate('user', 'name')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      message: 'Review statistics retrieved successfully',
      data: {
        overview: stats[0] || {
          totalReviews: 0,
          approvedReviews: 0,
          pendingReviews: 0,
          averageRating: 0,
          fiveStarReviews: 0,
          fourStarReviews: 0,
          threeStarReviews: 0,
          twoStarReviews: 0,
          oneStarReviews: 0
        },
        topProducts,
        recentReviews
      }
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve review statistics',
      error: error.message
    });
  }
};

/**
 * Bulk moderate reviews
 * PUT /api/admin/reviews/bulk-moderate
 */
const bulkModerateReviews = async (req, res) => {
  try {
    const { reviewIds, action, moderatorNote } = req.body;

    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review IDs array is required'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    const updateData = {
      isApproved: action === 'approve',
      moderatedBy: req.user._id,
      moderatedAt: new Date()
    };

    if (moderatorNote) {
      updateData.moderatorNote = moderatorNote;
    }

    const result = await Review.updateMany(
      { _id: { $in: reviewIds } },
      updateData
    );

    // Update product ratings for approved reviews
    if (action === 'approve') {
      const reviews = await Review.find({ _id: { $in: reviewIds } });
      for (const review of reviews) {
        await review.updateProductRating();
      }
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} reviews ${action}d successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk moderate reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate reviews',
      error: error.message
    });
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  moderateReview,
  deleteReview,
  getReviewStats,
  bulkModerateReviews
};
