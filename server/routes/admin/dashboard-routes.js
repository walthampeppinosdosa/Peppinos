const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getCartAnalytics,
  exportReport
} = require('../../controllers/admin/dashboard-controller');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../../middleware/auth-middleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Dashboard Analytics Routes
// GET /api/admin/dashboard/analytics
router.get('/analytics', requireAdmin, getDashboardAnalytics);

// GET /api/admin/dashboard/cart-analytics
router.get('/cart-analytics', requireAdmin, getCartAnalytics);

// GET /api/admin/dashboard/export
router.get('/export', requireSuperAdmin, exportReport);

module.exports = router;
