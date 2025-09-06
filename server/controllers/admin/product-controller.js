const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } = require('../../helpers/cloudinary');
const { validationResult } = require('express-validator');
const { canPerformAction } = require('../../helpers/role-utils');

/**
 * Get all products with filtering and pagination
 * GET /api/admin/products
 */
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      isVegetarian = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
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

    // Category filter
    if (category) {
      query.category = category;
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
    const products = await Product.find(query)
      .populate('category', 'name isVegetarian')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(query);

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
 * Get single product by ID
 * GET /api/admin/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const product = req.product; // Loaded by middleware

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: { product }
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
 * Create new product
 * POST /api/admin/products
 */
const createProduct = async (req, res) => {
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
      category,
      mrp,
      discountedPrice,
      quantity,
      sizes,
      spicyLevel,
      preparationTime,
      addons,
      specialInstructions,
      isVegetarian,
      tags,
      nutritionalInfo
    } = req.body;

    // Check if user can create this type of product
    if (!canPerformAction(req.user.role, 'create', isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot create ${isVegetarian ? 'vegetarian' : 'non-vegetarian'} products`
      });
    }

    // Verify category exists and matches vegetarian status
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (categoryDoc.isVegetarian !== isVegetarian) {
      return res.status(400).json({
        success: false,
        message: 'Product vegetarian status must match category'
      });
    }

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file =>
          uploadToCloudinary(file.buffer, 'products')
        );
        images = await Promise.all(uploadPromises);
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload images',
          error: uploadError.message
        });
      }
    }

    // Create product
    const product = new Product({
      name,
      description,
      category,
      images,
      mrp,
      discountedPrice,
      quantity,
      sizes: sizes || ['Medium'],
      spicyLevel: spicyLevel || 'Not Applicable',
      preparationTime,
      addons: addons || [],
      specialInstructions,
      isVegetarian,
      tags: tags || [],
      nutritionalInfo: nutritionalInfo || {}
    });

    await product.save();

    // Populate category for response
    await product.populate('category', 'name isVegetarian');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

/**
 * Update product
 * PUT /api/admin/products/:id
 */
const updateProduct = async (req, res) => {
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

    const product = req.product; // Loaded by middleware
    const {
      name,
      description,
      category,
      mrp,
      discountedPrice,
      quantity,
      sizes,
      spicyLevel,
      preparationTime,
      addons,
      specialInstructions,
      isVegetarian,
      tags,
      nutritionalInfo,
      isActive
    } = req.body;

    // Check if user can update this type of product
    if (!canPerformAction(req.user.role, 'update', product.isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot update ${product.isVegetarian ? 'vegetarian' : 'non-vegetarian'} products`
      });
    }

    // If category is being changed, verify it exists and matches vegetarian status
    if (category && category !== product.category.toString()) {
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }

      if (categoryDoc.isVegetarian !== product.isVegetarian) {
        return res.status(400).json({
          success: false,
          message: 'Product vegetarian status must match category'
        });
      }
    }

    // Handle new image uploads
    let newImages = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file =>
          uploadToCloudinary(file.buffer, 'products')
        );
        newImages = await Promise.all(uploadPromises);
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload new images',
          error: uploadError.message
        });
      }
    }

    // Update product fields
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (mrp !== undefined) product.mrp = mrp;
    if (discountedPrice !== undefined) product.discountedPrice = discountedPrice;
    if (quantity !== undefined) product.quantity = quantity;
    if (sizes !== undefined) product.sizes = sizes;
    if (spicyLevel !== undefined) product.spicyLevel = spicyLevel;
    if (preparationTime !== undefined) product.preparationTime = preparationTime;
    if (addons !== undefined) product.addons = addons;
    if (specialInstructions !== undefined) product.specialInstructions = specialInstructions;
    if (tags !== undefined) product.tags = tags;
    if (nutritionalInfo !== undefined) product.nutritionalInfo = nutritionalInfo;
    if (isActive !== undefined) product.isActive = isActive;

    // Add new images to existing ones
    if (newImages.length > 0) {
      product.images = [...product.images, ...newImages];
    }

    await product.save();

    // Populate category for response
    await product.populate('category', 'name isVegetarian');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

/**
 * Delete product
 * DELETE /api/admin/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const product = req.product; // Loaded by middleware

    // Check if user can delete this type of product
    if (!canPerformAction(req.user.role, 'delete', product.isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot delete ${product.isVegetarian ? 'vegetarian' : 'non-vegetarian'} products`
      });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      try {
        const deletePromises = product.images.map(image =>
          deleteFromCloudinary(image.public_id)
        );
        await Promise.all(deletePromises);
      } catch (deleteError) {
        console.error('Failed to delete images from Cloudinary:', deleteError);
        // Continue with product deletion even if image deletion fails
      }
    }

    // Delete product
    await Product.findByIdAndDelete(product._id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

/**
 * Delete product image
 * DELETE /api/admin/products/:id/images/:imageId
 */
const deleteProductImage = async (req, res) => {
  try {
    const product = req.product; // Loaded by middleware
    const { imageId } = req.params;

    // Check if user can update this type of product
    if (!canPerformAction(req.user.role, 'update', product.isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot modify ${product.isVegetarian ? 'vegetarian' : 'non-vegetarian'} products`
      });
    }

    // Find the image
    const imageIndex = product.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = product.images[imageIndex];

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(image.public_id);
    } catch (deleteError) {
      console.error('Failed to delete image from Cloudinary:', deleteError);
    }

    // Remove from product
    product.images.splice(imageIndex, 1);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

/**
 * Bulk update products status
 * PUT /api/admin/products/bulk-status
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const { productIds, isActive } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
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
      _id: { $in: productIds },
      ...req.roleFilter
    };

    // Update products
    const result = await Product.updateMany(query, { isActive });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} products updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update products',
      error: error.message
    });
  }
};

/**
 * Get product statistics
 * GET /api/admin/products/stats
 */
const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: req.roleFilter },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveProducts: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          vegetarianProducts: {
            $sum: { $cond: [{ $eq: ['$isVegetarian', true] }, 1, 0] }
          },
          nonVegetarianProducts: {
            $sum: { $cond: [{ $eq: ['$isVegetarian', false] }, 1, 0] }
          },
          outOfStock: {
            $sum: { $cond: [{ $lte: ['$quantity', 0] }, 1, 0] }
          },
          averagePrice: { $avg: '$discountedPrice' },
          totalValue: { $sum: { $multiply: ['$quantity', '$discountedPrice'] } }
        }
      }
    ]);

    const categoryStats = await Product.aggregate([
      { $match: req.roleFilter },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryInfo.name' },
          productCount: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { productCount: -1 } }
    ]);

    res.status(200).json({
      success: true,
      message: 'Product statistics retrieved successfully',
      data: {
        overview: stats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          inactiveProducts: 0,
          vegetarianProducts: 0,
          nonVegetarianProducts: 0,
          outOfStock: 0,
          averagePrice: 0,
          totalValue: 0
        },
        categoryBreakdown: categoryStats
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
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  bulkUpdateStatus,
  getProductStats
};
