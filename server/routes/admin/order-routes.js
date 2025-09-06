const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  exportOrders
} = require('../../controllers/admin/order-controller');

// Import middleware
const { authenticateToken, requireAdmin } = require('../../middleware/auth-middleware');
const { loadOrder, validateObjectId } = require('../../middleware/resource-middleware');
const { createPermissionMiddleware } = require('../../middleware/rbac-middleware');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/orders - Get all orders with filtering
router.get('/orders', createPermissionMiddleware.viewOrders, getAllOrders);

// GET /api/admin/orders/stats - Get order statistics
router.get('/orders/stats', createPermissionMiddleware.viewOrders, getOrderStats);

// GET /api/admin/orders/export - Export orders
router.get('/orders/export', createPermissionMiddleware.viewOrders, exportOrders);

// GET /api/admin/orders/:id - Get single order
router.get('/orders/:id',
  validateObjectId('id'),
  loadOrder,
  createPermissionMiddleware.viewOrders,
  getOrderById
);

// PUT /api/admin/orders/:id/status - Update order status
router.put('/orders/:id/status',
  validateObjectId('id'),
  loadOrder,
  createPermissionMiddleware.updateOrderStatus,
  updateOrderStatus
);

module.exports = router;
