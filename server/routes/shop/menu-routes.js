const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllMenuItems,
  getMenuItemById,
  getAllCategories,
  getFeaturedMenuItems,
  searchMenuItems
} = require('../../controllers/shop/menu-controller');

// Import middleware
const { optionalAuth } = require('../../middleware/auth-middleware');
const { validateObjectId } = require('../../middleware/resource-middleware');

// GET /api/shop/menus - Get all menu items (public)
router.get('/menus', optionalAuth, getAllMenuItems);

// GET /api/shop/menus/featured - Get featured menu items
router.get('/menus/featured', optionalAuth, getFeaturedMenuItems);

// GET /api/shop/menus/search - Search menu items
router.get('/menus/search', optionalAuth, searchMenuItems);

// GET /api/shop/menus/:id - Get single menu item (public)
router.get('/menus/:id',
  validateObjectId('id'),
  optionalAuth,
  getMenuItemById
);

// GET /api/shop/categories - Get all categories (public)
router.get('/categories', optionalAuth, getAllCategories);

module.exports = router;
