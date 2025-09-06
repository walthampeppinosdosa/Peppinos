const Menu = require('../../models/Menu'); // Will be renamed to Menu model later
const Category = require('../../models/Category');
const { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } = require('../../helpers/cloudinary');
const { validationResult } = require('express-validator');
const { canPerformAction } = require('../../helpers/role-utils');

/**
 * Get all menu items with filtering and pagination
 * GET /api/admin/menu
 */
const getAllMenuItems = async (req, res) => {
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

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const menuItems = await Menu.find(query)
      .populate('category', 'name slug isVegetarian')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Menu.countDocuments(query);

    res.json({
      success: true,
      data: {
        menuItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items',
      error: error.message
    });
  }
};

/**
 * Get single menu item by ID
 * GET /api/admin/menu/:id
 */
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await Menu.findById(id)
      .populate('category', 'name slug isVegetarian');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Check if user can access this menu item based on role
    if (req.roleFilter && !req.roleFilter.isVegetarian === undefined) {
      if (req.roleFilter.isVegetarian !== menuItem.isVegetarian) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this menu item'
        });
      }
    }

    res.json({
      success: true,
      data: menuItem
    });

  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu item',
      error: error.message
    });
  }
};

/**
 * Create new menu item
 * POST /api/admin/menu
 */
const createMenuItem = async (req, res) => {
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
      specialInstructions,
      tags,
      nutritionalInfo
    } = req.body;

    // Validate category and determine vegetarian status
    const categoryDoc = await Category.findById(category).populate('parentCategory');
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Determine if menu item is vegetarian based on category's parent category
    let menuItemIsVegetarian = true; // Default to vegetarian
    if (categoryDoc.parentCategory) {
      // If category has a parent, use parent's vegetarian status
      menuItemIsVegetarian = categoryDoc.parentCategory.isVegetarian;
    } else if (categoryDoc.type === 'parent') {
      // If this is a parent category itself
      menuItemIsVegetarian = categoryDoc.isVegetarian;
    }

    // Role-based access control
    const userRole = req.user.role;
    if (userRole === 'veg-admin' && !menuItemIsVegetarian) {
      return res.status(403).json({
        success: false,
        message: 'You cannot create non-vegetarian menu items'
      });
    }

    if (userRole === 'non-veg-admin' && menuItemIsVegetarian) {
      return res.status(403).json({
        success: false,
        message: 'You cannot create vegetarian menu items'
      });
    }

    // Category already validated above, no need to re-fetch

    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadResults = await uploadMultipleToCloudinary(req.files, 'menu-items');
        imageUrls = uploadResults.map(result => result.secure_url);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload images',
          error: uploadError.message
        });
      }
    }

    // Create menu item
    const menuItem = new Menu({
      name,
      description,
      category,
      mrp: parseFloat(mrp),
      discountedPrice: parseFloat(discountedPrice),
      quantity: parseInt(quantity),
      sizes: Array.isArray(sizes) ? sizes : [sizes],
      spicyLevel,
      preparationTime: parseInt(preparationTime),
      specialInstructions,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      nutritionalInfo: nutritionalInfo ? JSON.parse(nutritionalInfo) : undefined,
      images: imageUrls,
      isVegetarian: menuItemIsVegetarian,
      isActive: true,
      createdBy: req.user.id
    });

    await menuItem.save();

    // Populate category for response
    await menuItem.populate('category', 'name slug isVegetarian');

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });

  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create menu item',
      error: error.message
    });
  }
};

/**
 * Update menu item
 * PUT /api/admin/menu/:id
 */
const updateMenuItem = async (req, res) => {
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

    const menuItem = req.menuItem; // Loaded by middleware
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

    // Check if user can update this type of menu item
    if (!canPerformAction(req.user.role, 'update', menuItem.isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot update ${menuItem.isVegetarian ? 'vegetarian' : 'non-vegetarian'} menu items`
      });
    }

    // If category is being changed, verify it exists and matches vegetarian status
    if (category && category !== menuItem.category.toString()) {
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }

      if (categoryDoc.isVegetarian !== menuItem.isVegetarian) {
        return res.status(400).json({
          success: false,
          message: 'Menu item vegetarian status must match category'
        });
      }
    }

    // Handle new image uploads
    let newImages = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file =>
          uploadToCloudinary(file.buffer, 'menu-items')
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

    // Update menu item fields
    if (name !== undefined) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (category !== undefined) menuItem.category = category;
    if (mrp !== undefined) menuItem.mrp = mrp;
    if (discountedPrice !== undefined) menuItem.discountedPrice = discountedPrice;
    if (quantity !== undefined) menuItem.quantity = quantity;
    if (sizes !== undefined) menuItem.sizes = sizes;
    if (spicyLevel !== undefined) menuItem.spicyLevel = spicyLevel;
    if (preparationTime !== undefined) menuItem.preparationTime = preparationTime;
    if (addons !== undefined) menuItem.addons = addons;
    if (specialInstructions !== undefined) menuItem.specialInstructions = specialInstructions;
    if (tags !== undefined) menuItem.tags = tags;
    if (nutritionalInfo !== undefined) menuItem.nutritionalInfo = nutritionalInfo;
    if (isActive !== undefined) menuItem.isActive = isActive;

    // Add new images to existing ones
    if (newImages.length > 0) {
      menuItem.images = [...menuItem.images, ...newImages];
    }

    await menuItem.save();

    // Populate category for response
    await menuItem.populate('category', 'name isVegetarian');

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: { menuItem }
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item',
      error: error.message
    });
  }
};

/**
 * Delete menu item
 * DELETE /api/admin/menu/:id
 */
const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = req.menuItem; // Loaded by middleware

    // Check if user can delete this type of menu item
    if (!canPerformAction(req.user.role, 'delete', menuItem.isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `You cannot delete ${menuItem.isVegetarian ? 'vegetarian' : 'non-vegetarian'} menu items`
      });
    }

    // Delete images from cloudinary
    if (menuItem.images && menuItem.images.length > 0) {
      try {
        const deletePromises = menuItem.images.map(imageUrl => {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          return deleteFromCloudinary(publicId);
        });
        await Promise.all(deletePromises);
      } catch (deleteError) {
        console.error('Error deleting images from cloudinary:', deleteError);
        // Continue with menu item deletion even if image deletion fails
      }
    }

    await Menu.findByIdAndDelete(menuItem._id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item',
      error: error.message
    });
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};
