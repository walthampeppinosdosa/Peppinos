const { 
  hasPermission, 
  canPerformAction, 
  getRoleBasedFilter,
  canModifyResources,
  PERMISSIONS 
} = require('../helpers/role-utils');

/**
 * Role-Based Access Control (RBAC) middleware factory
 * @param {string} permission - Required permission
 * @returns {Function} - Express middleware function
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this action'
      });
    }

    next();
  };
};

/**
 * Middleware to check resource-specific permissions
 * @param {string} action - Action being performed (create, update, delete)
 * @param {string} resourceType - Type of resource (menuItem, menu, category)
 * @returns {Function} - Express middleware function
 */
const requireResourcePermission = (action, resourceType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin has full access to all resources
    if (req.user.role === 'super-admin') {
      return next();
    }

    // For create operations, check the request body
    if (action === 'create') {
      const isVegetarian = req.body.isVegetarian;
      
      if (isVegetarian === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Vegetarian status is required'
        });
      }

      if (!canPerformAction(req.user.role, action, isVegetarian)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You cannot ${action} ${isVegetarian ? 'vegetarian' : 'non-vegetarian'} ${resourceType}s.`
        });
      }
    }

    // For update/delete operations, check the loaded resource
    if (['update', 'delete'].includes(action)) {
      const resource = req.menuItem || req.menu || req.category;

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${resourceType} not found`
        });
      }

      if (!canPerformAction(req.user.role, action, resource.isVegetarian)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You cannot ${action} ${resource.isVegetarian ? 'vegetarian' : 'non-vegetarian'} ${resourceType}s.`
        });
      }
    }

    next();
  };
};

/**
 * Middleware to add role-based filters to database queries
 */
const addRoleBasedFilter = (req, res, next) => {
  if (req.user) {
    req.roleFilter = getRoleBasedFilter(req.user.role);
  } else {
    req.roleFilter = {};
  }
  next();
};

/**
 * Middleware to prevent write operations for read-only roles
 * Note: Super admin now has full access, so this middleware is mainly for future read-only roles
 */
const preventWriteForReadOnly = (req, res, next) => {
  // Currently no read-only roles defined
  // This middleware is kept for future use
  next();
};

/**
 * Middleware to check if user can modify any resources
 */
const requireModifyPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!canModifyResources(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to modify resources'
    });
  }

  next();
};

/**
 * Middleware to validate vegetarian status in request body
 */
const validateVegetarianStatus = (req, res, next) => {
  if (req.body.isVegetarian === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Vegetarian status (isVegetarian) is required'
    });
  }

  if (typeof req.body.isVegetarian !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Vegetarian status must be a boolean value'
    });
  }

  next();
};

/**
 * Middleware to check if user can access specific vegetarian/non-vegetarian resources
 */
const checkVegNonVegAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Super admin can access everything
  if (req.user.role === 'super-admin') {
    return next();
  }

  const isVegetarian = req.body.isVegetarian ||
                      (req.menuItem && req.menuItem.isVegetarian) ||
                      (req.menu && req.menu.isVegetarian) ||
                      (req.category && req.category.isVegetarian);

  if (isVegetarian !== undefined) {
    if (!canPerformAction(req.user.role, 'manage', isVegetarian)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only manage ${req.user.role === 'veg-admin' ? 'vegetarian' : 'non-vegetarian'} resources.`
      });
    }
  }

  next();
};

/**
 * Middleware factory for specific permission checks
 */
const createPermissionMiddleware = {
  viewMenuItems: requirePermission(PERMISSIONS.VIEW_ALL_MENU_ITEMS),
  createVegMenuItems: requirePermission(PERMISSIONS.CREATE_VEG_MENU_ITEMS),
  createNonVegMenuItems: requirePermission(PERMISSIONS.CREATE_NON_VEG_MENU_ITEMS),
  updateVegMenuItems: requirePermission(PERMISSIONS.UPDATE_VEG_MENU_ITEMS),
  updateNonVegMenuItems: requirePermission(PERMISSIONS.UPDATE_NON_VEG_MENU_ITEMS),
  deleteVegMenuItems: requirePermission(PERMISSIONS.DELETE_VEG_MENU_ITEMS),
  deleteNonVegMenuItems: requirePermission(PERMISSIONS.DELETE_NON_VEG_MENU_ITEMS),
  
  viewCategories: requirePermission(PERMISSIONS.VIEW_ALL_CATEGORIES),
  createVegCategories: requirePermission(PERMISSIONS.CREATE_VEG_CATEGORIES),
  createNonVegCategories: requirePermission(PERMISSIONS.CREATE_NON_VEG_CATEGORIES),
  updateVegCategories: requirePermission(PERMISSIONS.UPDATE_VEG_CATEGORIES),
  updateNonVegCategories: requirePermission(PERMISSIONS.UPDATE_NON_VEG_CATEGORIES),
  deleteVegCategories: requirePermission(PERMISSIONS.DELETE_VEG_CATEGORIES),
  deleteNonVegCategories: requirePermission(PERMISSIONS.DELETE_NON_VEG_CATEGORIES),
  
  viewOrders: requirePermission(PERMISSIONS.VIEW_ALL_ORDERS),
  updateOrderStatus: requirePermission(PERMISSIONS.UPDATE_ORDER_STATUS),
  
  viewUsers: requirePermission(PERMISSIONS.VIEW_ALL_USERS),
  updateUserRoles: requirePermission(PERMISSIONS.UPDATE_USER_ROLES),
  
  moderateReviews: requirePermission(PERMISSIONS.MODERATE_REVIEWS),
  
  viewAnalytics: requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  exportReports: requirePermission(PERMISSIONS.EXPORT_REPORTS)
};

module.exports = {
  requirePermission,
  requireResourcePermission,
  addRoleBasedFilter,
  preventWriteForReadOnly,
  requireModifyPermission,
  validateVegetarianStatus,
  checkVegNonVegAccess,
  createPermissionMiddleware
};
