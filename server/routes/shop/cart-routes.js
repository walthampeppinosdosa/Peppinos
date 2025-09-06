const express = require('express');
const router = express.Router();

// Import controllers
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon
} = require('../../controllers/shop/cart-controller');

// Import middleware
const { authenticateToken } = require('../../middleware/auth-middleware');
const { validateObjectId } = require('../../middleware/resource-middleware');
const {
  validateAddToCart,
  validateUpdateCartItem,
  handleValidationErrors
} = require('../../middleware/validation-middleware');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/shop/cart - Get user's cart
router.get('/cart', getCart);

// POST /api/shop/cart/items - Add item to cart
router.post('/cart/items',
  validateAddToCart,
  handleValidationErrors,
  addToCart
);

// PUT /api/shop/cart/items/:itemId - Update cart item quantity
router.put('/cart/items/:itemId',
  validateObjectId('itemId'),
  validateUpdateCartItem,
  handleValidationErrors,
  updateCartItem
);

// DELETE /api/shop/cart/items/:itemId - Remove item from cart
router.delete('/cart/items/:itemId',
  validateObjectId('itemId'),
  removeFromCart
);

// DELETE /api/shop/cart - Clear entire cart
router.delete('/cart', clearCart);

// POST /api/shop/cart/coupon - Apply coupon
router.post('/cart/coupon', applyCoupon);

// DELETE /api/shop/cart/coupon - Remove coupon
router.delete('/cart/coupon', removeCoupon);

module.exports = router;
