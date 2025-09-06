const Category = require('../../models/Category');
const Menu = require('../../models/Menu');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../helpers/cloudinary');
const { validationResult } = require('express-validator');
const { canPerformAction } = require('../../helpers/role-utils');

/**
 * Get all categories with filtering and pagination
 * GET /api/admin/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      parentCategory = '',
      isActive = '',
      sortBy = 'sortOrder',
      sortOrder = 'asc',
      hierarchical = 'false'
    } = req.query;

    // If hierarchical view is requested
    if (hierarchical === 'true') {
      const hierarchicalCategories = await Category.getHierarchical();

      // Apply role-based filtering
      let filteredCategories = hierarchicalCategories;
      if (req.roleFilter && Object.keys(req.roleFilter).length > 0) {
        filteredCategories = hierarchicalCategories.filter(category => {
          if (req.roleFilter.isVegetarian !== undefined) {
            return category.isVegetarian === req.roleFilter.isVegetarian;
          }
          return true;
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Hierarchical categories retrieved successfully',
        data: {
          categories: filteredCategories,
          hierarchical: true
        }
      });
    }

    // Build query
    let query = {};

    // Apply role-based filter for menu categories
    if (req.roleFilter && Object.keys(req.roleFilter).length > 0) {
      // For role-based filtering, we need to filter by parent category
      if (req.roleFilter.isVegetarian !== undefined) {
        const parentCategories = await Category.find({
          type: 'parent',
          isVegetarian: req.roleFilter.isVegetarian
        }).select('_id');

        if (parentCategories.length > 0) {
          query.$or = [
            { type: 'parent', isVegetarian: req.roleFilter.isVegetarian },
            { type: 'menu', parentCategory: { $in: parentCategories.map(p => p._id) } }
          ];
        }
      }
    }

    // Search filter
    if (search) {
      const searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };

      if (query.$or) {
        query = { $and: [{ $or: query.$or }, searchQuery] };
      } else {
        query = searchQuery;
      }
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Parent category filter
    if (parentCategory) {
      query.parentCategory = parentCategory;
    }

    // Active filter
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination and population
    const categories = await Category.find(query)
      .populate('parentCategory', 'name isVegetarian')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get menu item count for each category
    const categoriesWithCount = await Promise.all(
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

    // Get total count for pagination
    const total = await Category.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: {
        categories: categoriesWithCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
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
 * Get single category by ID
 * GET /api/admin/categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const category = req.category; // Loaded by middleware

    // Get menu item count
    const menuItemCount = await Menu.countDocuments({
      category: category._id
    });

    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: {
        category: {
          ...category.toObject(),
          menuItemCount
        }
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category',
      error: error.message
    });
  }
};

/**
 * Create new category
 * POST /api/admin/categories
 */
const createCategory = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      type = 'menu',
      parentCategory,
      isVegetarian,
      sortOrder
    } = req.body;

    // Validate category type
    if (!['parent', 'menu'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category type. Must be either "parent" or "menu"'
      });
    }

    // For menu categories, validate parent category
    if (type === 'menu') {
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category is required for menu categories'
        });
      }

      // Check if parent category exists and is a parent type
      const parent = await Category.findById(parentCategory);
      if (!parent || parent.type !== 'parent') {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent category'
        });
      }

      // Check if user can create categories for this parent
      if (!canPerformAction(req.user.role, 'create', parent.isVegetarian)) {
        return res.status(403).json({
          success: false,
          message: `You cannot create categories for ${parent.isVegetarian ? 'vegetarian' : 'non-vegetarian'} parent category`
        });
      }
    } else {
      // For parent categories, check permission based on isVegetarian
      if (isVegetarian === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isVegetarian is required for parent categories'
        });
      }

      if (!canPerformAction(req.user.role, 'create', isVegetarian)) {
        return res.status(403).json({
          success: false,
          message: `You cannot create ${isVegetarian ? 'vegetarian' : 'non-vegetarian'} parent categories`
        });
      }
    }

    // Handle image upload (only required for menu categories)
    let image;
    if (req.file) {
      try {
        image = await uploadToCloudinary(req.file.buffer, 'categories');
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload image',
          error: uploadError.message
        });
      }
    } else if (type === 'menu') {
      return res.status(400).json({
        success: false,
        message: 'Category image is required for menu categories'
      });
    }

    // Create category
    const categoryData = {
      name,
      description,
      type,
      sortOrder: sortOrder || 0
    };

    if (type === 'menu') {
      categoryData.parentCategory = parentCategory;
      if (image) categoryData.image = image;
    } else {
      categoryData.isVegetarian = isVegetarian;
    }

    const category = new Category(categoryData);

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * Update category
 * PUT /api/admin/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const category = req.category; // Loaded by middleware
    const {
      name,
      description,
      isVegetarian,
      sortOrder,
      isActive
    } = req.body;

    // Check if user can update this type of category
    if (!canPerformAction(req.user.role, 'update', category.isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot update ${category.isVegetarian ? 'vegetarian' : 'non-vegetarian'} categories`
      });
    }

    // Handle new image upload
    let newImage;
    if (req.file) {
      try {
        newImage = await uploadToCloudinary(req.file.buffer, 'categories');

        // Delete old image from Cloudinary
        if (category.image && category.image.public_id) {
          try {
            await deleteFromCloudinary(category.image.public_id);
          } catch (deleteError) {
            console.error('Failed to delete old image:', deleteError);
          }
        }
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload new image',
          error: uploadError.message
        });
      }
    }

    // Update category fields
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (isVegetarian !== undefined) category.isVegetarian = isVegetarian;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;
    if (newImage) category.image = newImage;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * Delete category
 * DELETE /api/admin/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const category = req.category; // Loaded by middleware

    // Check if user can delete this type of category
    if (!canPerformAction(req.user.role, 'delete', category.isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot delete ${category.isVegetarian ? 'vegetarian' : 'non-vegetarian'} categories`
      });
    }

    // Check if category has menu items
    const menuItemCount = await Menu.countDocuments({
      category: category._id
    });

    if (menuItemCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${menuItemCount} menu items associated with it.`
      });
    }

    // Delete image from Cloudinary
    if (category.image && category.image.public_id) {
      try {
        await deleteFromCloudinary(category.image.public_id);
      } catch (deleteError) {
        console.error('Failed to delete image from Cloudinary:', deleteError);
        // Continue with category deletion even if image deletion fails
      }
    }

    // Delete category
    await Category.findByIdAndDelete(category._id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

/**
 * Bulk update categories status
 * PUT /api/admin/categories/bulk-status
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const { categoryIds, isActive } = req.body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category IDs array is required'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    // Build query with role filter
    const query = {
      _id: { $in: categoryIds },
      ...req.roleFilter
    };

    // Update categories
    const result = await Category.updateMany(query, { isActive });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} categories updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update categories',
      error: error.message
    });
  }
};

/**
 * Get parent categories
 * GET /api/admin/categories/parents
 */
const getParentCategories = async (req, res) => {
  try {
    // Apply role-based filtering
    let filter = { type: 'parent', isActive: true };

    if (req.roleFilter && req.roleFilter.isVegetarian !== undefined) {
      filter.isVegetarian = req.roleFilter.isVegetarian;
    }

    const parentCategories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Parent categories retrieved successfully',
      data: { categories: parentCategories }
    });
  } catch (error) {
    console.error('Get parent categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve parent categories',
      error: error.message
    });
  }
};

/**
 * Get menu categories based on parent category and user role
 * GET /api/admin/categories/menu
 */
const getMenuCategories = async (req, res) => {
  try {
    const { parentId } = req.query;

    // Build filter for menu categories
    let filter = { type: 'menu', isActive: true };

    // If parentId is provided, filter by parent
    if (parentId) {
      filter.parentCategory = parentId;
    } else {
      // If no parentId, apply role-based filtering
      if (req.roleFilter && req.roleFilter.isVegetarian !== undefined) {
        // Find parent categories that match the role filter
        const parentCategories = await Category.find({
          type: 'parent',
          isVegetarian: req.roleFilter.isVegetarian,
          isActive: true
        }).select('_id');

        filter.parentCategory = { $in: parentCategories.map(p => p._id) };
      }
    }

    const menuCategories = await Category.find(filter)
      .populate('parentCategory', 'name isVegetarian')
      .select('name description parentCategory')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Menu categories retrieved successfully',
      data: { categories: menuCategories }
    });
  } catch (error) {
    console.error('Get menu categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve menu categories',
      error: error.message
    });
  }
};

/**
 * Get category statistics
 * GET /api/admin/categories/stats
 */
const getCategoryStats = async (req, res) => {
  try {
    const stats = await Category.aggregate([
      { $match: req.roleFilter },
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          activeCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          vegetarianCategories: {
            $sum: { $cond: [{ $eq: ['$isVegetarian', true] }, 1, 0] }
          },
          nonVegetarianCategories: {
            $sum: { $cond: [{ $eq: ['$isVegetarian', false] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Category statistics retrieved successfully',
      data: stats[0] || {
        totalCategories: 0,
        activeCategories: 0,
        inactiveCategories: 0,
        vegetarianCategories: 0,
        nonVegetarianCategories: 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getParentCategories,
  getMenuCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateStatus,
  getCategoryStats
};
