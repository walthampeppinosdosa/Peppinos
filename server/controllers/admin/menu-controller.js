const Menu = require('../../models/Menu'); // Will be renamed to Menu model later
const Category = require('../../models/Category');
const mongoose = require('mongoose');
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
      .populate('spicyLevel', 'name level')
      .populate('preparations', 'name')
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
      .populate('category', 'name slug isVegetarian')
      .populate('spicyLevel', 'name level')
      .populate('preparations', 'name');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Check if user can access this menu item based on role
    if (req.roleFilter && req.roleFilter.isVegetarian !== undefined) {
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
      preparation,
      preparationTime,
      specialInstructions,
      tags,
      addons,
      nutritionalInfo,
      images
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

    // Handle image uploads or JSON image data
    let imageData = [];

    if (req.files && req.files.length > 0) {
      // Handle file uploads
      try {
        const fileBuffers = req.files.map(file => file.buffer);
        const uploadResults = await uploadMultipleToCloudinary(fileBuffers, 'menu-items');
        imageData = uploadResults.map(result => ({
          public_id: result.public_id,
          url: result.url,
          width: result.width,
          height: result.height
        }));
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload images',
          error: uploadError.message
        });
      }
    } else if (images) {
      // Handle JSON image data (for testing or when images are already uploaded)
      try {
        imageData = Array.isArray(images) ? images : JSON.parse(images);
      } catch (parseError) {
        console.error('Image data parse error:', parseError);
        return res.status(400).json({
          success: false,
          message: 'Invalid image data format'
        });
      }
    }

    // Prepare menu item data
    const menuItemData = {
      name,
      description,
      category,
      mrp: parseFloat(mrp),
      discountedPrice: parseFloat(discountedPrice),
      quantity: parseInt(quantity),
      sizes: (() => {
        try {
          if (typeof sizes === 'string') {
            return JSON.parse(sizes);
          }
          return Array.isArray(sizes) ? sizes : (sizes ? [sizes] : []);
        } catch (error) {
          console.error('Error parsing sizes:', error);
          return [];
        }
      })(),
      preparationTime: parseInt(preparationTime),
      specialInstructions,
      tags: (() => {
        try {
          if (typeof tags === 'string') {
            return JSON.parse(tags);
          }
          return Array.isArray(tags) ? tags : (tags ? [tags] : []);
        } catch (error) {
          console.error('Error parsing tags:', error);
          return [];
        }
      })(),
      addons: (() => {
        try {
          if (typeof addons === 'string') {
            return JSON.parse(addons);
          }
          return Array.isArray(addons) ? addons : (addons ? [addons] : []);
        } catch (error) {
          console.error('Error parsing addons:', error);
          return [];
        }
      })(),
      preparations: (() => {
        try {
          if (!preparation) return [];

          // Handle case where preparation might be an array of values (from duplicate fields)
          let prepValue = preparation;
          if (Array.isArray(preparation)) {
            // Take the last value (most recent)
            prepValue = preparation[preparation.length - 1];
          }

          let parsedPreparations;
          if (typeof prepValue === 'string') {
            parsedPreparations = JSON.parse(prepValue);
          } else {
            parsedPreparations = Array.isArray(prepValue) ? prepValue : (prepValue ? [prepValue] : []);
          }

          // Convert to ObjectIds
          return parsedPreparations.map(prep => new mongoose.Types.ObjectId(prep));
        } catch (error) {
          console.error('Error parsing preparations:', error);
          return [];
        }
      })(),
      nutritionalInfo: nutritionalInfo ? JSON.parse(nutritionalInfo) : undefined,
      images: imageData,
      isVegetarian: menuItemIsVegetarian,
      isActive: true,
      createdBy: req.user.id
    };

    // Add spicyLevel for all items (if provided)
    if (spicyLevel) {
      try {
        // Handle spicyLevel as JSON string (from FormData) or direct array
        const spicyLevelArray = typeof spicyLevel === 'string' ? JSON.parse(spicyLevel) : spicyLevel;
        if (Array.isArray(spicyLevelArray) && spicyLevelArray.length > 0) {
          // Filter out 'not-applicable' values and only keep valid ObjectIds
          const validSpicyLevels = spicyLevelArray.filter(level =>
            level !== 'not-applicable' && level && level.trim() !== ''
          ).map(level => new mongoose.Types.ObjectId(level)); // Convert to ObjectId
          if (validSpicyLevels.length > 0) {
            menuItemData.spicyLevel = validSpicyLevels;
          }
        }
      } catch (error) {
        console.error('Error parsing spicyLevel:', error);
        // Fallback to single spicyLevel for backward compatibility
        if (spicyLevel !== 'not-applicable' && spicyLevel.trim() !== '') {
          try {
            menuItemData.spicyLevel = [new mongoose.Types.ObjectId(spicyLevel)];
          } catch (objIdError) {
            console.error('Error converting spicyLevel to ObjectId:', objIdError);
          }
        }
      }
    }

    // Create menu item
    const menuItem = new Menu(menuItemData);

    await menuItem.save();

    // Populate category, spicy levels, and preparations for response
    await menuItem.populate([
      { path: 'category', select: 'name slug isVegetarian' },
      { path: 'spicyLevel', select: 'name level' },
      { path: 'preparations', select: 'name' }
    ]);

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
      preparation,
      preparationTime,
      addons,
      specialInstructions,
      isVegetarian,
      tags,
      nutritionalInfo,
      isActive
    } = req.body;

    // Permission check is handled by middleware

    // If category is being changed, verify it exists and matches vegetarian status
    if (category && category !== menuItem.category._id.toString()) {
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
    if (sizes !== undefined) {
      try {
        menuItem.sizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      } catch (error) {
        console.error('Error parsing sizes:', error);
        menuItem.sizes = [];
      }
    }
    if (spicyLevel !== undefined) {
      try {
        // Handle spicyLevel as JSON string (from FormData) or direct array
        const spicyLevelArray = typeof spicyLevel === 'string' ? JSON.parse(spicyLevel) : spicyLevel;
        if (Array.isArray(spicyLevelArray)) {
          // Filter out 'not-applicable' values and only keep valid ObjectIds
          const validSpicyLevels = spicyLevelArray.filter(level =>
            level !== 'not-applicable' && level && level.trim() !== ''
          ).map(level => new mongoose.Types.ObjectId(level)); // Convert to ObjectId
          menuItem.spicyLevel = validSpicyLevels;
        } else {
          // Fallback to single spicyLevel for backward compatibility
          if (spicyLevel !== 'not-applicable' && spicyLevel.trim() !== '') {
            try {
              menuItem.spicyLevel = [new mongoose.Types.ObjectId(spicyLevel)];
            } catch (objIdError) {
              console.error('Error converting spicyLevel to ObjectId:', objIdError);
              menuItem.spicyLevel = [];
            }
          } else {
            menuItem.spicyLevel = [];
          }
        }
      } catch (error) {
        console.error('Error parsing spicyLevel:', error);
        // Fallback to single spicyLevel for backward compatibility
        if (spicyLevel !== 'not-applicable' && spicyLevel.trim() !== '') {
          try {
            menuItem.spicyLevel = [new mongoose.Types.ObjectId(spicyLevel)];
          } catch (objIdError) {
            console.error('Error converting spicyLevel to ObjectId:', objIdError);
            menuItem.spicyLevel = [];
          }
        } else {
          menuItem.spicyLevel = [];
        }
      }
    }
    if (preparationTime !== undefined) menuItem.preparationTime = preparationTime;
    if (addons !== undefined) {
      try {
        menuItem.addons = typeof addons === 'string' ? JSON.parse(addons) : addons;
      } catch (error) {
        console.error('Error parsing addons:', error);
        menuItem.addons = [];
      }
    }
    if (specialInstructions !== undefined) menuItem.specialInstructions = specialInstructions;
    if (tags !== undefined) {
      try {
        menuItem.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        console.error('Error parsing tags:', error);
        menuItem.tags = [];
      }
    }
    if (preparation !== undefined) {
      try {
        // Handle case where preparation might be an array of values (from duplicate fields)
        let prepValue = preparation;
        if (Array.isArray(preparation)) {
          // Take the last value (most recent)
          prepValue = preparation[preparation.length - 1];
        }

        let parsedPreparations = typeof prepValue === 'string' ? JSON.parse(prepValue) : prepValue;
        // Convert to ObjectIds
        menuItem.preparations = Array.isArray(parsedPreparations)
          ? parsedPreparations.map(prep => new mongoose.Types.ObjectId(prep))
          : [];
      } catch (error) {
        console.error('Error parsing preparations:', error);
        menuItem.preparations = [];
      }
    }
    if (nutritionalInfo !== undefined) menuItem.nutritionalInfo = nutritionalInfo;
    if (isActive !== undefined) menuItem.isActive = isActive;

    // Handle image updates (deletions, reordering, and new uploads)
    const { existingImages, imagesToDelete } = req.body;

    // Delete images from Cloudinary if specified
    if (imagesToDelete) {
      try {
        const imagesToDeleteArray = typeof imagesToDelete === 'string' ? JSON.parse(imagesToDelete) : imagesToDelete;
        if (Array.isArray(imagesToDeleteArray) && imagesToDeleteArray.length > 0) {
          const deletePromises = imagesToDeleteArray.map(imageUrl => {
            try {
              // Handle both string URLs and image objects
              const url = typeof imageUrl === 'string' ? imageUrl : imageUrl.url;

              // Extract public_id from Cloudinary URL
              // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.ext
              const urlParts = url.split('/');
              const publicIdWithExtension = urlParts[urlParts.length - 1];
              const publicId = publicIdWithExtension.split('.')[0];

              // Check if the URL contains a folder structure
              const folderIndex = urlParts.findIndex(part => part === 'upload');
              if (folderIndex !== -1 && folderIndex + 2 < urlParts.length) {
                // Skip version (v123456) and get folder + public_id
                const pathAfterUpload = urlParts.slice(folderIndex + 2).join('/');
                const finalPublicId = pathAfterUpload.replace(/\.[^/.]+$/, ''); // Remove extension
                return deleteFromCloudinary(finalPublicId);
              } else {
                return deleteFromCloudinary(`menu-items/${publicId}`);
              }
            } catch (error) {
              console.error('Error processing image URL for deletion:', imageUrl, error);
              return Promise.resolve(); // Don't fail the entire operation
            }
          });
          await Promise.all(deletePromises);
        }
      } catch (deleteError) {
        console.error('Error deleting images from Cloudinary:', deleteError);
        // Continue with update even if deletion fails
      }
    }

    // Update images array with existing images in new order + new uploads
    let updatedImages = [];

    // Add existing images in their new order
    if (existingImages) {
      try {
        const existingImagesArray = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        if (Array.isArray(existingImagesArray)) {
          // Map URL strings back to full image objects from current menu item
          updatedImages = existingImagesArray.map(imageUrl => {
            // Find the corresponding image object in current menu item
            const imageObj = menuItem.images.find(img =>
              (typeof img === 'string' ? img : img.url) === imageUrl
            );
            return imageObj || imageUrl; // Fallback to URL if object not found
          }).filter(img => img); // Remove any null/undefined entries
        }
      } catch (error) {
        console.error('Error parsing existingImages:', error);
        // Fallback to current images
        updatedImages = [...menuItem.images];
      }
    } else {
      // If no existingImages specified, keep current images
      updatedImages = [...menuItem.images];
    }

    // Add new uploaded images
    if (newImages.length > 0) {
      updatedImages = [...updatedImages, ...newImages];
    }

    menuItem.images = updatedImages;

    await menuItem.save();

    // Populate category, spicy levels, and preparations for response
    await menuItem.populate([
      { path: 'category', select: 'name slug isVegetarian' },
      { path: 'spicyLevel', select: 'name level' },
      { path: 'preparations', select: 'name' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
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

    // Permission check is handled by middleware

    // Delete images from cloudinary
    if (menuItem.images && menuItem.images.length > 0) {
      try {
        const deletePromises = menuItem.images.map(imageUrl => {
          try {
            // Extract public_id from Cloudinary URL
            const urlParts = imageUrl.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');

            if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
              // Skip version (v123456) and get folder + public_id
              const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
              const finalPublicId = pathAfterUpload.replace(/\.[^/.]+$/, ''); // Remove extension
              return deleteFromCloudinary(finalPublicId);
            } else {
              // Fallback: try to extract just the filename
              const publicId = imageUrl?.split('/').pop().split('.')[0];
              return deleteFromCloudinary(`menu-items/${publicId}`);
            }
          } catch (error) {
            console.error('Error processing image URL for deletion:', imageUrl, error);
            return Promise.resolve(); // Don't fail the entire operation
          }
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
