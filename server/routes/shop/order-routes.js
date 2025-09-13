const express = require('express');
const router = express.Router();
const { createOrder } = require('../../controllers/shop/order-controller');
const { authenticateToken, optionalAuth } = require('../../middleware/auth-middleware');

// POST /api/shop/orders - Create new order (guest or authenticated)
router.post('/orders', optionalAuth, createOrder);

// GET /api/shop/orders/user - Get current user orders (authenticated only)
router.get('/orders/user', authenticateToken, async (req, res) => {
  try {
    const Order = require('../../models/Order');
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
      .populate('items.menu')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        orders
      }
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// GET /api/shop/orders/:orderId/track - Track specific order (authenticated only)
router.get('/orders/:orderId/track', authenticateToken, async (req, res) => {
  try {
    const Order = require('../../models/Order');
    const orderId = req.params.orderId;
    const userId = req.user.id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    }).populate('items.menu');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        order
      }
    });

  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track order',
      error: error.message
    });
  }
});

// PUT /api/shop/orders/:orderId/cancel - Cancel order (authenticated only)
router.put('/orders/:orderId/cancel', authenticateToken, async (req, res) => {
  try {
    const Order = require('../../models/Order');
    const orderId = req.params.orderId;
    const userId = req.user.id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow cancellation of pending orders
    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    order.deliveryStatus = 'cancelled';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        order
      }
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
});

// GET /api/shop/orders/guest/:sessionId - Get guest orders by session
router.get('/orders/guest/:sessionId', async (req, res) => {
  try {
    const Order = require('../../models/Order');
    const sessionId = req.params.sessionId;

    const orders = await Order.find({ guestSessionId: sessionId })
      .populate('items.menu')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('Error fetching guest orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// GET /api/shop/orders/track/:orderNumber - Track order by order number
router.get('/orders/track/:orderNumber', async (req, res) => {
  try {
    const Order = require('../../models/Order');
    const orderNumber = req.params.orderNumber;

    const order = await Order.findOne({ orderNumber })
      .populate('items.menu');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track order',
      error: error.message
    });
  }
});

// POST /api/shop/payment/checkout - Stripe checkout (placeholder for now)
router.post('/payment/checkout', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Stripe checkout endpoint not implemented yet'
  });
});

module.exports = router;
