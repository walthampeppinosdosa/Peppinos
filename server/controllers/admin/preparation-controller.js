const Preparation = require('../../models/Preparation');
const Category = require('../../models/Category');
const { validationResult } = require('express-validator');

/**
 * Get all preparations
 * GET /api/admin/preparations
 */
const getAllPreparations = async (req, res) => {
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
    
    const [preparations, total] = await Promise.all([
      Preparation.find(filter)
        .populate('parentCategory', 'name isVegetarian')
        .populate('createdBy', 'name')
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Preparation.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      message: 'Preparations retrieved successfully',
      data: {
        preparations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get preparations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve preparations',
      error: error.message
    });
  }
};

/**
 * Get preparations by parent category
 * GET /api/admin/preparations/by-category/:parentCategoryId
 */
const getPreparationsByCategory = async (req, res) => {
  try {
    const { parentCategoryId } = req.params;
    
    const preparations = await Preparation.findByParentCategory(parentCategoryId);
    
    res.status(200).json({
      success: true,
      message: 'Preparations retrieved successfully',
      data: { preparations }
    });
  } catch (error) {
    console.error('Get preparations by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve preparations',
      error: error.message
    });
  }
};

/**
 * Create new preparation
 * POST /api/admin/preparations
 */
const createPreparation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, parentCategory, sortOrder } = req.body;
    
    // Check if preparation already exists for this parent category
    const existingPreparation = await Preparation.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      parentCategory 
    });
    
    if (existingPreparation) {
      return res.status(400).json({
        success: false,
        message: 'Preparation with this name already exists for this category'
      });
    }

    const preparation = new Preparation({
      name,
      description,
      parentCategory,
      sortOrder: sortOrder || 0,
      createdBy: req.user._id
    });

    await preparation.save();
    await preparation.populate('parentCategory', 'name isVegetarian');
    await preparation.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Preparation created successfully',
      data: { preparation }
    });
  } catch (error) {
    console.error('Create preparation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create preparation',
      error: error.message
    });
  }
};

/**
 * Update preparation
 * PUT /api/admin/preparations/:id
 */
const updatePreparation = async (req, res) => {
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
    const { name, description, parentCategory, sortOrder, isActive } = req.body;

    const preparation = await Preparation.findById(id);
    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Preparation not found'
      });
    }

    // Check for duplicate name in same parent category (excluding current preparation)
    if (name && name !== preparation.name) {
      const existingPreparation = await Preparation.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        parentCategory: parentCategory || preparation.parentCategory,
        _id: { $ne: id }
      });

      if (existingPreparation) {
        return res.status(400).json({
          success: false,
          message: 'Preparation with this name already exists for this category'
        });
      }
    }

    // Update fields
    if (name) preparation.name = name;
    if (description !== undefined) preparation.description = description;
    if (parentCategory) preparation.parentCategory = parentCategory;
    if (sortOrder !== undefined) preparation.sortOrder = sortOrder;
    if (isActive !== undefined) preparation.isActive = isActive;

    await preparation.save();
    await preparation.populate('parentCategory', 'name isVegetarian');
    await preparation.populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Preparation updated successfully',
      data: { preparation }
    });
  } catch (error) {
    console.error('Update preparation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preparation',
      error: error.message
    });
  }
};

/**
 * Delete preparation
 * DELETE /api/admin/preparations/:id
 */
const deletePreparation = async (req, res) => {
  try {
    const { id } = req.params;

    const preparation = await Preparation.findById(id);
    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Preparation not found'
      });
    }

    await Preparation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Preparation deleted successfully'
    });
  } catch (error) {
    console.error('Delete preparation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete preparation',
      error: error.message
    });
  }
};

module.exports = {
  getAllPreparations,
  getPreparationsByCategory,
  createPreparation,
  updatePreparation,
  deletePreparation
};
