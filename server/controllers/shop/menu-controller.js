const Menu = require('../../models/Menu');
const Category = require('../../models/Category');

/**
 * Get all menu items for shop (public)
 * GET /api/shop/menu
 */
const getAllMenuItems = async (req, res) => {
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

    // Build query - only active menu items
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
    const menuItems = await Menu.find(query)
      .populate('category', 'name slug')
      .select('-__v')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Menu.countDocuments(query);

    // Get available filters for frontend
    const filters = await Menu.aggregate([
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
      message: 'Menu items retrieved successfully',
      data: {
        menuItems,
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
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve menu items',
      error: error.message
    });
  }
};

/**
 * Get single menu item by ID (public)
 * GET /api/shop/menu/:id
 */
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await Menu.findOne({ _id: id, isActive: true })
      .populate('category', 'name slug description')
      .lean();

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Get reviews for this menu item
    const Review = require('../../models/Review');
    const reviews = await Review.find({
      menu: menuItem._id,
      isApproved: true
    })
    .populate('user', 'name profileImage')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    menuItem.reviews = reviews;

    // Get related menu items from same category
    const relatedMenuItems = await Menu.find({
      category: menuItem.category._id,
      _id: { $ne: menuItem._id },
      isActive: true
    })
      .select('name images discountedPrice mrp averageRating')
      .limit(6)
      .lean();

    res.status(200).json({
      success: true,
      message: 'Menu item retrieved successfully',
      data: {
        menuItem,
        relatedMenuItems
      }
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve menu item',
      error: error.message
    });
  }
};

/**
 * Get all categories (public) - returns both parent and menu categories
 * GET /api/shop/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const {
      isVegetarian = '',
      type = '',
      hierarchical = 'false',
      parentId = ''
    } = req.query;

    // Build query - only active categories
    let query = { isActive: true };

    // Type filter (parent or menu)
    if (type) {
      query.type = type;
    }

    // Parent category filter for menu categories
    if (parentId) {
      query.parentCategory = parentId;
    }

    // For parent categories, apply vegetarian filter
    if (isVegetarian !== '' && (!type || type === 'parent')) {
      query.isVegetarian = isVegetarian === 'true';
    }

    let categories;

    if (hierarchical === 'true') {
      // Return hierarchical structure with parent categories and their menu categories
      categories = await Category.getHierarchical();
    } else {
      // Return flat list of categories
      categories = await Category.find(query)
        .populate('parentCategory', 'name isVegetarian')
        .select('-__v')
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      // Get menu item count for each category
      categories = await Promise.all(
        categories.map(async (category) => {
          const menuItemCount = await Menu.countDocuments({
            category: category._id,
            isActive: true
          });
          return {
            ...category,
            menuItemCount
          };
        })
      );
    }

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: { categories }
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
 * Get featured menu items
 * GET /api/shop/menu/featured
 */
const getFeaturedMenuItems = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Get menu items with high ratings or recent additions
    const featuredMenuItems = await Menu.find({
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
      message: 'Featured menu items retrieved successfully',
      data: { menuItems: featuredMenuItems }
    });
  } catch (error) {
    console.error('Get featured menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve featured menu items',
      error: error.message
    });
  }
};

/**
 * Search menu items with suggestions
 * GET /api/shop/menu/search
 */
const searchMenuItems = async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (!q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Search in menu items
    const menuItems = await Menu.find({
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
    const suggestions = await Menu.aggregate([
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
        menuItems,
        suggestions: suggestions.map(s => s.name),
        query: q
      }
    });
  } catch (error) {
    console.error('Search menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search menu items',
      error: error.message
    });
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  getAllCategories,
  getFeaturedMenuItems,
  searchMenuItems
};
