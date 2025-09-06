const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Middleware to load product by ID and attach to req.product
 */
const loadProduct = async (req, res, next) => {
  try {
    const productId = req.params.id || req.params.productId;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const product = await Product.findById(productId).populate('category');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    req.product = product;
    next();
  } catch (error) {
    console.error('Load product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading product'
    });
  }
};

/**
 * Middleware to load category by ID and attach to req.category
 */
const loadCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id || req.params.categoryId;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    const category = await Category.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    req.category = category;
    next();
  } catch (error) {
    console.error('Load category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading category'
    });
  }
};

/**
 * Middleware to load order by ID and attach to req.order
 */
const loadOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id || req.params.orderId;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product', 'name images');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    req.order = order;
    next();
  } catch (error) {
    console.error('Load order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading order'
    });
  }
};

/**
 * Middleware to load user by ID and attach to req.targetUser
 */
const loadUser = async (req, res, next) => {
  try {
    const userId = req.params.id || req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    req.targetUser = user;
    next();
  } catch (error) {
    console.error('Load user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading user'
    });
  }
};

/**
 * Middleware to check if user owns the resource (for user-specific operations)
 */
const checkOwnership = (resourceField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin users can access any resource
    const adminRoles = ['super-admin', 'veg-admin', 'non-veg-admin'];
    if (adminRoles.includes(req.user.role)) {
      return next();
    }

    // Get the resource (could be order, cart, address, etc.)
    const resource = req.order || req.cart || req.address || req.targetUser;
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if user owns the resource
    const resourceUserId = resource[resourceField]?.toString() || resource._id?.toString();
    const currentUserId = req.user._id.toString();

    if (resourceUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

/**
 * Middleware to validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} is required`
      });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

module.exports = {
  loadProduct,
  loadCategory,
  loadOrder,
  loadUser,
  checkOwnership,
  validateObjectId
};
