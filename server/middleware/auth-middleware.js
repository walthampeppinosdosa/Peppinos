const User = require('../models/User');
const { verifyAccessToken, extractTokenFromHeader } = require('../helpers/jwt-utils');

/**
 * Middleware to authenticate user using JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header or cookies
    let token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin (any admin role)
 */
const requireAdmin = (req, res, next) => {
  const adminRoles = ['super-admin', 'veg-admin', 'non-veg-admin'];
  return authorizeRoles(...adminRoles)(req, res, next);
};

/**
 * Middleware to check if user is super admin
 */
const requireSuperAdmin = (req, res, next) => {
  return authorizeRoles('super-admin')(req, res, next);
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = extractTokenFromHeader(req.headers.authorization);

    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password -refreshToken');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Middleware to check if user can manage vegetarian products/categories
 */
const requireVegAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const allowedRoles = ['super-admin', 'veg-admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Vegetarian product management permission required.'
    });
  }

  next();
};

/**
 * Middleware to check if user can manage non-vegetarian products/categories
 */
const requireNonVegAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const allowedRoles = ['super-admin', 'non-veg-admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Non-vegetarian product management permission required.'
    });
  }

  next();
};

/**
 * Middleware to check product access based on user role and product type
 * This middleware should be used after product is loaded into req.product
 */
const checkProductAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Super admin has access to everything
  if (req.user.role === 'super-admin') {
    return next();
  }

  // Get product from request (should be loaded by previous middleware)
  const product = req.product;
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Check role-based access
  if (req.user.role === 'veg-admin' && !product.isVegetarian) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only manage vegetarian products.'
    });
  }

  if (req.user.role === 'non-veg-admin' && product.isVegetarian) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only manage non-vegetarian products.'
    });
  }

  next();
};

/**
 * Middleware to check category access based on user role and category type
 * This middleware should be used after category is loaded into req.category
 */
const checkCategoryAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Super admin has access to everything
  if (req.user.role === 'super-admin') {
    return next();
  }

  // Get category from request (should be loaded by previous middleware)
  const category = req.category;
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check role-based access
  if (req.user.role === 'veg-admin' && !category.isVegetarian) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only manage vegetarian categories.'
    });
  }

  if (req.user.role === 'non-veg-admin' && category.isVegetarian) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only manage non-vegetarian categories.'
    });
  }

  next();
};

/**
 * Middleware to filter products/categories based on user role
 * Adds filter conditions to req.roleFilter
 */
const addRoleFilter = (req, res, next) => {
  req.roleFilter = {};

  if (req.user) {
    if (req.user.role === 'veg-admin') {
      req.roleFilter.isVegetarian = true;
    } else if (req.user.role === 'non-veg-admin') {
      req.roleFilter.isVegetarian = false;
    }
    // Super admin and customers see everything, so no filter needed
  }

  next();
};

/**
 * Middleware to check if user has read-only access (for super admin)
 */
const checkReadOnlyAccess = (req, res, next) => {
  if (req.user && req.user.role === 'super-admin') {
    // Super admin has view-only access, block write operations
    const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeOperations.includes(req.method)) {
      return res.status(403).json({
        success: false,
        message: 'Super admin has read-only access. Write operations are not allowed.'
      });
    }
  }
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireSuperAdmin,
  optionalAuth,
  requireVegAccess,
  requireNonVegAccess,
  checkProductAccess,
  checkCategoryAccess,
  addRoleFilter,
  checkReadOnlyAccess
};
