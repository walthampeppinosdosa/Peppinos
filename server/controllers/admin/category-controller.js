const Category = require('../../models/Category');
const Product = require('../../models/Product');
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
      isVegetarian = '',
      isActive = '',
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    let query = { ...req.roleFilter }; // Apply role-based filter

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Vegetarian filter
    if (isVegetarian !== '') {
      query.isVegetarian = isVegetarian === 'true';
    }

    // Active filter
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const categories = await Category.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
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

    // Get product count
    const productCount = await Product.countDocuments({
      category: category._id
    });

    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: {
        category: {
          ...category.toObject(),
          productCount
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
      isVegetarian,
      sortOrder
    } = req.body;

    // Check if user can create this type of category
    if (!canPerformAction(req.user.role, 'create', isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot create ${isVegetarian ? 'vegetarian' : 'non-vegetarian'} categories`
      });
    }

    // Handle image upload
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
    } else {
      return res.status(400).json({
        success: false,
        message: 'Category image is required'
      });
    }

    // Create category
    const category = new Category({
      name,
      description,
      image,
      isVegetarian,
      sortOrder: sortOrder || 0
    });

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

    // Check if category has products
    const productCount = await Product.countDocuments({
      category: category._id
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${productCount} products associated with it.`
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
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateStatus,
  getCategoryStats
};
