const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} = require('../../controllers/admin/menu-controller');

// Import middleware
const { authenticateToken, requireAdmin } = require('../../middleware/auth-middleware');
const { loadMenuItem, validateObjectId } = require('../../middleware/resource-middleware');
const {
  requireResourcePermission,
  addRoleBasedFilter,
  checkVegNonVegAccess
} = require('../../middleware/rbac-middleware');
const {
  validateMenuItem,
  validateBulkOperation,
  handleValidationErrors
} = require('../../middleware/validation-middleware');
const { uploadMenuItemImages, handleMulterError } = require('../../helpers/upload-middleware');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/menu - Get all menu items with filtering
router.get('/',
  (req, res, next) => {
    // Ensure roleFilter is set even if addRoleBasedFilter fails
    if (!req.roleFilter) {
      req.roleFilter = {};
    }
    next();
  },
  addRoleBasedFilter,
  getAllMenuItems
);

// POST /api/admin/menu - Create new menu item
router.post('/',
  uploadMenuItemImages,
  handleMulterError,
  validateMenuItem,
  handleValidationErrors,
  requireResourcePermission('create', 'menu'),
  createMenuItem
);

// GET /api/admin/menu/:id - Get single menu item
router.get('/:id',
  validateObjectId,
  loadMenuItem,
  checkVegNonVegAccess,
  getMenuItemById
);

// PUT /api/admin/menu/:id - Update menu item
router.put('/:id',
  validateObjectId,
  loadMenuItem,
  uploadMenuItemImages,
  handleMulterError,
  validateMenuItem,
  handleValidationErrors,
  requireResourcePermission('update', 'menu'),
  checkVegNonVegAccess,
  updateMenuItem
);

// DELETE /api/admin/menu/:id - Delete menu item
router.delete('/:id',
  validateObjectId,
  loadMenuItem,
  requireResourcePermission('delete', 'menu'),
  checkVegNonVegAccess,
  deleteMenuItem
);

module.exports = router;
