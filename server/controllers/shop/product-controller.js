const Product = require('../../models/Product');
const Category = require('../../models/Category');

/**
 * Get all products for shop (public)
 * GET /api/shop/products
 */
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      isVegetarian = '',
      minPrice = '',
      maxPrice = '',
      spicyLevel = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags = ''
    } = req.query;

    // Build query - only active products
    let query = { isActive: true };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Vegetarian filter
    if (isVegetarian !== '') {
      query.isVegetarian = isVegetarian === 'true';
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.discountedPrice = {};
      if (minPrice) query.discountedPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.discountedPrice.$lte = parseFloat(maxPrice);
    }

    // Spicy level filter
    if (spicyLevel) {
      query.spicyLevel = spicyLevel;
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Sort options
    const sortOptions = {};
    if (sortBy === 'price') {
      sortOptions.discountedPrice = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'rating') {
      sortOptions.averageRating = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'popularity') {
      sortOptions.totalReviews = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .select('-__v')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Get available filters for frontend
    const filters = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          priceRange: {
            $push: {
              min: { $min: '$discountedPrice' },
              max: { $max: '$discountedPrice' }
            }
          },
          spicyLevels: { $addToSet: '$spicyLevel' },
          availableTags: { $addToSet: '$tags' }
        }
      },
      {
        $project: {
          minPrice: { $min: '$priceRange.min' },
          maxPrice: { $max: '$priceRange.max' },
          spicyLevels: 1,
          availableTags: {
            $reduce: {
              input: '$availableTags',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] }
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: filters[0] || {
          minPrice: 0,
          maxPrice: 0,
          spicyLevels: [],
          availableTags: []
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
};

/**
 * Get single product by ID (public)
 * GET /api/shop/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, isActive: true })
      .populate('category', 'name slug description')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'name profileImage'
        },
        match: { isApproved: true },
        options: { sort: { createdAt: -1 }, limit: 10 }
      })
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get related products from same category
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true
    })
      .select('name images discountedPrice mrp averageRating')
      .limit(6)
      .lean();

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: {
        product,
        relatedProducts
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product',
      error: error.message
    });
  }
};

/**
 * Get all categories (public)
 * GET /api/shop/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const { isVegetarian = '' } = req.query;

    // Build query - only active categories
    let query = { isActive: true };

    // Vegetarian filter
    if (isVegetarian !== '') {
      query.isVegetarian = isVegetarian === 'true';
    }

    const categories = await Category.find(query)
      .select('-__v')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category._id,
          isActive: true
        });
        return {
          ...category,
          productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: { categories: categoriesWithCount }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error.message
    });
  }
};

/**
 * Get featured products
 * GET /api/shop/products/featured
 */
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Get products with high ratings or recent additions
    const featuredProducts = await Product.find({
      isActive: true,
      $or: [
        { averageRating: { $gte: 4.0 } },
        { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Last 30 days
      ]
    })
      .populate('category', 'name')
      .select('name images discountedPrice mrp averageRating totalReviews')
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      message: 'Featured products retrieved successfully',
      data: { products: featuredProducts }
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve featured products',
      error: error.message
    });
  }
};

/**
 * Search products with suggestions
 * GET /api/shop/products/search
 */
const searchProducts = async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (!q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Search in products
    const products = await Product.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    })
      .populate('category', 'name')
      .select('name images discountedPrice mrp averageRating')
      .limit(parseInt(limit))
      .lean();

    // Get search suggestions
    const suggestions = await Product.aggregate([
      {
        $match: {
          isActive: true,
          name: { $regex: q, $options: 'i' }
        }
      },
      {
        $project: {
          name: 1,
          _id: 0
        }
      },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: {
        products,
        suggestions: suggestions.map(s => s.name),
        query: q
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getAllCategories,
  getFeaturedProducts,
  searchProducts
};
