const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllCategories,
  getParentCategories,
  getMenuCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateStatus,
  getCategoryStats
} = require('../../controllers/admin/category-controller');

// Import middleware
const { authenticateToken, requireAdmin } = require('../../middleware/auth-middleware');
const { loadCategory, validateObjectId } = require('../../middleware/resource-middleware');
const {
  requireResourcePermission,
  addRoleBasedFilter,
  checkVegNonVegAccess
} = require('../../middleware/rbac-middleware');
const {
  validateCategory,
  validateCategoryBulkOperation,
  handleValidationErrors
} = require('../../middleware/validation-middleware');
const { uploadCategoryImage, handleMulterError } = require('../../helpers/upload-middleware');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/categories - Get all categories with filtering
router.get('/categories', addRoleBasedFilter, getAllCategories);

// GET /api/admin/categories/parents - Get parent categories
router.get('/categories/parents', addRoleBasedFilter, getParentCategories);

// GET /api/admin/categories/menu - Get menu categories
router.get('/categories/menu', addRoleBasedFilter, getMenuCategories);

// GET /api/admin/categories/stats - Get category statistics
router.get('/categories/stats', addRoleBasedFilter, getCategoryStats);

// POST /api/admin/categories - Create new category
router.post('/categories',
  uploadCategoryImage,
  handleMulterError,
  validateCategory,
  handleValidationErrors,
  requireResourcePermission('create', 'category'),
  createCategory
);

// PUT /api/admin/categories/bulk-status - Bulk update category status
router.put('/categories/bulk-status',
  validateCategoryBulkOperation,
  handleValidationErrors,
  addRoleBasedFilter,
  bulkUpdateStatus
);

// GET /api/admin/categories/:id - Get single category
router.get('/categories/:id',
  validateObjectId('id'),
  loadCategory,
  checkVegNonVegAccess,
  getCategoryById
);

// PUT /api/admin/categories/:id - Update category
router.put('/categories/:id',
  validateObjectId('id'),
  loadCategory,
  uploadCategoryImage,
  handleMulterError,
  validateCategory,
  handleValidationErrors,
  requireResourcePermission('update', 'category'),
  updateCategory
);

// DELETE /api/admin/categories/:id - Delete category
router.delete('/categories/:id',
  validateObjectId('id'),
  loadCategory,
  requireResourcePermission('delete', 'category'),
  deleteCategory
);

module.exports = router;
