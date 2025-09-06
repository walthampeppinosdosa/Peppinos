const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  bulkUpdateStatus,
  getProductStats
} = require('../../controllers/admin/product-controller');

// Import middleware
const { authenticateToken, requireAdmin } = require('../../middleware/auth-middleware');
const { loadProduct, validateObjectId } = require('../../middleware/resource-middleware');
const {
  requireResourcePermission,
  addRoleBasedFilter,
  checkVegNonVegAccess
} = require('../../middleware/rbac-middleware');
const {
  validateProduct,
  validateBulkOperation,
  handleValidationErrors
} = require('../../middleware/validation-middleware');
const { uploadProductImages, handleMulterError } = require('../../helpers/upload-middleware');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/products - Get all products with filtering
router.get('/products', addRoleBasedFilter, getAllProducts);

// GET /api/admin/products/stats - Get product statistics
router.get('/products/stats', addRoleBasedFilter, getProductStats);

// POST /api/admin/products - Create new product
router.post('/products',
  uploadProductImages,
  handleMulterError,
  validateProduct,
  handleValidationErrors,
  requireResourcePermission('create', 'product'),
  createProduct
);

// PUT /api/admin/products/bulk-status - Bulk update product status
router.put('/products/bulk-status',
  validateBulkOperation,
  handleValidationErrors,
  addRoleBasedFilter,
  bulkUpdateStatus
);

// GET /api/admin/products/:id - Get single product
router.get('/products/:id',
  validateObjectId('id'),
  loadProduct,
  checkVegNonVegAccess,
  getProductById
);

// PUT /api/admin/products/:id - Update product
router.put('/products/:id',
  validateObjectId('id'),
  loadProduct,
  uploadProductImages,
  handleMulterError,
  validateProduct,
  handleValidationErrors,
  requireResourcePermission('update', 'product'),
  updateProduct
);

// DELETE /api/admin/products/:id - Delete product
router.delete('/products/:id',
  validateObjectId('id'),
  loadProduct,
  requireResourcePermission('delete', 'product'),
  deleteProduct
);

// DELETE /api/admin/products/:id/images/:imageId - Delete product image
router.delete('/products/:id/images/:imageId',
  validateObjectId('id'),
  loadProduct,
  requireResourcePermission('update', 'product'),
  deleteProductImage
);

module.exports = router;
