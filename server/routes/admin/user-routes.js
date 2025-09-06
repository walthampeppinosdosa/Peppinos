const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getUserStats
} = require('../../controllers/admin/user-controller');

// Import middleware
const { authenticateToken, requireAdmin } = require('../../middleware/auth-middleware');
const { validateObjectId, loadUser } = require('../../middleware/resource-middleware');
const { createPermissionMiddleware } = require('../../middleware/rbac-middleware');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/users - Get all users with filtering
router.get('/users', createPermissionMiddleware.viewUsers, getAllUsers);

// GET /api/admin/users/stats - Get user statistics
router.get('/users/stats', createPermissionMiddleware.viewUsers, getUserStats);

// GET /api/admin/users/:id - Get single user
router.get('/users/:id',
  validateObjectId('id'),
  loadUser,
  createPermissionMiddleware.viewUsers,
  getUserById
);

// PUT /api/admin/users/:id/status - Update user status
router.put('/users/:id/status',
  validateObjectId('id'),
  loadUser,
  createPermissionMiddleware.updateUserRoles,
  updateUserStatus
);

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role',
  validateObjectId('id'),
  loadUser,
  createPermissionMiddleware.updateUserRoles,
  updateUserRole
);

module.exports = router;
