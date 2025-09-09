const SpicyLevel = require('../../models/SpicyLevel');
const Category = require('../../models/Category');
const { validationResult } = require('express-validator');

/**
 * Get all spicy levels
 * GET /api/admin/spicy-levels
 */
const getAllSpicyLevels = async (req, res) => {
  try {
    const { parentCategory, isActive, search, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    
    // Apply filters based on user role
    if (req.user.role === 'veg-admin') {
      const vegParentCategory = await Category.findOne({ isVegetarian: true, type: 'parent' });
      if (vegParentCategory) {
        filter.parentCategory = vegParentCategory._id;
      }
    } else if (req.user.role === 'non-veg-admin') {
      const nonVegParentCategory = await Category.findOne({ isVegetarian: false, type: 'parent' });
      if (nonVegParentCategory) {
        filter.parentCategory = nonVegParentCategory._id;
      }
    } else if (parentCategory) {
      filter.parentCategory = parentCategory;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [spicyLevels, total] = await Promise.all([
      SpicyLevel.find(filter)
        .populate('parentCategory', 'name isVegetarian')
        .populate('createdBy', 'name')
        .sort({ level: 1, sortOrder: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SpicyLevel.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      message: 'Spicy levels retrieved successfully',
      data: {
        spicyLevels,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get spicy levels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve spicy levels',
      error: error.message
    });
  }
};

/**
 * Get spicy levels by parent category
 * GET /api/admin/spicy-levels/by-category/:parentCategoryId
 */
const getSpicyLevelsByCategory = async (req, res) => {
  try {
    const { parentCategoryId } = req.params;
    
    const spicyLevels = await SpicyLevel.findByParentCategory(parentCategoryId);
    
    res.status(200).json({
      success: true,
      message: 'Spicy levels retrieved successfully',
      data: { spicyLevels }
    });
  } catch (error) {
    console.error('Get spicy levels by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve spicy levels',
      error: error.message
    });
  }
};

/**
 * Create new spicy level
 * POST /api/admin/spicy-levels
 */
const createSpicyLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, level, parentCategory, sortOrder } = req.body;
    
    // Check if spicy level already exists for this parent category
    const existingSpicyLevel = await SpicyLevel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      parentCategory 
    });
    
    if (existingSpicyLevel) {
      return res.status(400).json({
        success: false,
        message: 'Spicy level with this name already exists for this category'
      });
    }

    const spicyLevel = new SpicyLevel({
      name,
      description,
      level,
      parentCategory,
      sortOrder: sortOrder || 0,
      createdBy: req.user._id
    });

    await spicyLevel.save();
    await spicyLevel.populate('parentCategory', 'name isVegetarian');
    await spicyLevel.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Spicy level created successfully',
      data: { spicyLevel }
    });
  } catch (error) {
    console.error('Create spicy level error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create spicy level',
      error: error.message
    });
  }
};

/**
 * Update spicy level
 * PUT /api/admin/spicy-levels/:id
 */
const updateSpicyLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, description, level, parentCategory, sortOrder, isActive } = req.body;

    const spicyLevel = await SpicyLevel.findById(id);
    if (!spicyLevel) {
      return res.status(404).json({
        success: false,
        message: 'Spicy level not found'
      });
    }

    // Check for duplicate name in same parent category (excluding current spicy level)
    if (name && name !== spicyLevel.name) {
      const existingSpicyLevel = await SpicyLevel.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        parentCategory: parentCategory || spicyLevel.parentCategory,
        _id: { $ne: id }
      });

      if (existingSpicyLevel) {
        return res.status(400).json({
          success: false,
          message: 'Spicy level with this name already exists for this category'
        });
      }
    }

    // Update fields
    if (name) spicyLevel.name = name;
    if (description !== undefined) spicyLevel.description = description;
    if (level !== undefined) spicyLevel.level = level;
    if (parentCategory) spicyLevel.parentCategory = parentCategory;
    if (sortOrder !== undefined) spicyLevel.sortOrder = sortOrder;
    if (isActive !== undefined) spicyLevel.isActive = isActive;

    await spicyLevel.save();
    await spicyLevel.populate('parentCategory', 'name isVegetarian');
    await spicyLevel.populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Spicy level updated successfully',
      data: { spicyLevel }
    });
  } catch (error) {
    console.error('Update spicy level error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update spicy level',
      error: error.message
    });
  }
};

/**
 * Delete spicy level
 * DELETE /api/admin/spicy-levels/:id
 */
const deleteSpicyLevel = async (req, res) => {
  try {
    const { id } = req.params;

    const spicyLevel = await SpicyLevel.findById(id);
    if (!spicyLevel) {
      return res.status(404).json({
        success: false,
        message: 'Spicy level not found'
      });
    }

    await SpicyLevel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Spicy level deleted successfully'
    });
  } catch (error) {
    console.error('Delete spicy level error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete spicy level',
      error: error.message
    });
  }
};

module.exports = {
  getAllSpicyLevels,
  getSpicyLevelsByCategory,
  createSpicyLevel,
  updateSpicyLevel,
  deleteSpicyLevel
};
