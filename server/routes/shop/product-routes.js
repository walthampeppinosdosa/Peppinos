const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllProducts,
  getProductById,
  getAllCategories,
  getFeaturedProducts,
  searchProducts
} = require('../../controllers/shop/product-controller');

// Import middleware
const { optionalAuth } = require('../../middleware/auth-middleware');
const { validateObjectId } = require('../../middleware/resource-middleware');

// GET /api/shop/products - Get all products (public)
router.get('/products', optionalAuth, getAllProducts);

// GET /api/shop/products/featured - Get featured products
router.get('/products/featured', optionalAuth, getFeaturedProducts);

// GET /api/shop/products/search - Search products
router.get('/products/search', optionalAuth, searchProducts);

// GET /api/shop/products/:id - Get single product (public)
router.get('/products/:id',
  validateObjectId('id'),
  optionalAuth,
  getProductById
);

// GET /api/shop/categories - Get all categories (public)
router.get('/categories', optionalAuth, getAllCategories);

module.exports = router;
