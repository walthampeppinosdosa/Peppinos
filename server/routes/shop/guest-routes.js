const express = require('express');
const router = express.Router();

// Import controllers
const {
  getGuestCart,
  addToGuestCart,
  updateGuestCartItem,
  removeFromGuestCart,
  clearGuestCart
} = require('../../controllers/shop/guest-cart-controller');

const {
  createGuestOrder,
  getGuestOrder,
  getGuestOrdersByEmail,
  getGuestOrdersBySession,
  trackGuestOrder
} = require('../../controllers/shop/guest-order-controller');

// Import middleware
const {
  validateGuestAddToCart,
  validateGuestUpdateCartItem,
  validateGuestCheckout,
  handleValidationErrors
} = require('../../middleware/validation-middleware');

const {
  ensureGuestSession,
  getGuestSessionId,
  trackGuestActivity,
  generateSessionId
} = require('../../middleware/session-middleware');

// Apply session middleware to all guest routes
router.use(getGuestSessionId);
router.use(trackGuestActivity);

// Guest Cart Routes
/**
 * @route   GET /api/shop/guest/cart/:sessionId
 * @desc    Get guest cart
 * @access  Public
 */
router.get('/cart/:sessionId', getGuestCart);

/**
 * @route   POST /api/shop/guest/cart/:sessionId
 * @desc    Add item to guest cart
 * @access  Public
 */
router.post('/cart/:sessionId', 
  validateGuestAddToCart,
  handleValidationErrors,
  addToGuestCart
);

/**
 * @route   PUT /api/shop/guest/cart/:sessionId/items/:itemId
 * @desc    Update guest cart item quantity
 * @access  Public
 */
router.put('/cart/:sessionId/items/:itemId',
  validateGuestUpdateCartItem,
  handleValidationErrors,
  updateGuestCartItem
);

/**
 * @route   DELETE /api/shop/guest/cart/:sessionId/items/:itemId
 * @desc    Remove item from guest cart
 * @access  Public
 */
router.delete('/cart/:sessionId/items/:itemId', removeFromGuestCart);

/**
 * @route   DELETE /api/shop/guest/cart/:sessionId
 * @desc    Clear guest cart
 * @access  Public
 */
router.delete('/cart/:sessionId', clearGuestCart);

// Guest Order Routes
/**
 * @route   POST /api/shop/guest/checkout
 * @desc    Create guest order (checkout)
 * @access  Public
 */
router.post('/checkout',
  ensureGuestSession,
  validateGuestCheckout,
  handleValidationErrors,
  createGuestOrder
);

/**
 * @route   GET /api/shop/guest/orders/:orderNumber
 * @desc    Get guest order by order number
 * @access  Public
 */
router.get('/orders/:orderNumber', getGuestOrder);

/**
 * @route   GET /api/shop/guest/orders/email/:email
 * @desc    Get guest orders by email
 * @access  Public
 */
router.get('/orders/email/:email', getGuestOrdersByEmail);

/**
 * @route   GET /api/shop/guest/orders/session/:sessionId
 * @desc    Get guest orders by session ID
 * @access  Public
 */
router.get('/orders/session/:sessionId', getGuestOrdersBySession);

/**
 * @route   GET /api/shop/guest/orders/:orderNumber/track
 * @desc    Track guest order status
 * @access  Public
 */
router.get('/orders/:orderNumber/track', trackGuestOrder);

// Guest Session Management Routes
/**
 * @route   GET /api/shop/guest/session
 * @desc    Get or create guest session
 * @access  Public
 */
router.get('/session', ensureGuestSession, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Guest session retrieved successfully',
    data: {
      sessionId: req.guestSessionId
    }
  });
});

/**
 * @route   POST /api/shop/guest/session
 * @desc    Create new guest session
 * @access  Public
 */
router.post('/session', (req, res) => {
  const sessionId = generateSessionId();
  res.status(201).json({
    success: true,
    message: 'Guest session created successfully',
    data: {
      sessionId
    }
  });
});

/**
 * @route   DELETE /api/shop/guest/session/:sessionId
 * @desc    Destroy guest session and associated cart
 * @access  Public
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { destroyGuestSession } = require('../../middleware/session-middleware');
    
    const success = await destroyGuestSession(sessionId);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Guest session destroyed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to destroy guest session'
      });
    }
  } catch (error) {
    console.error('Destroy guest session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to destroy guest session',
      error: error.message
    });
  }
});

// Health check route for guest services
/**
 * @route   GET /api/shop/guest/health
 * @desc    Health check for guest services
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Guest services are healthy',
    timestamp: new Date().toISOString(),
    sessionId: req.guestSessionId
  });
});

module.exports = router;
