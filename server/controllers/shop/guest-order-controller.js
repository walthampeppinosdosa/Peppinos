const { validationResult } = require('express-validator');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Menu = require('../../models/Menu');
const { getOrCreateGuestUser, getGuestUserBySession } = require('../../services/guest-service');

/**
 * Create guest order (checkout)
 * POST /api/shop/guest/checkout
 */
const createGuestOrder = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      sessionId,
      customer,
      deliveryAddress,
      orderType = 'delivery',
      timing = 'asap',
      scheduledDate,
      scheduledTime,
      paymentMethod = 'pay_online',
      specialInstructions = ''
    } = req.body;

    // Get or create guest user with provided info
    const guestUser = await getOrCreateGuestUser(sessionId, customer);

    // Get guest cart
    const cart = await Cart.findOne({ user: guestUser._id }).populate('items.menu');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty or not found'
      });
    }

    // Validate all cart items are still available
    for (const item of cart.items) {
      const menuItem = await Menu.findById(item.menu._id);
      if (!menuItem || !menuItem.isActive) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${item.menu.name}" is no longer available`
        });
      }

      if (menuItem.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${menuItem.quantity} of "${item.menu.name}" available in stock`
        });
      }
    }

    // Calculate order totals
    const subtotal = cart.subtotal;
    const deliveryFee = subtotal >= 50 ? 0 : 5.99; // Free delivery over $50
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const discount = (cart.appliedCoupon && cart.appliedCoupon.discountAmount) ? cart.appliedCoupon.discountAmount : 0;
    const totalPrice = subtotal + deliveryFee + tax - discount;

    // Prepare order items
    const orderItems = cart.items.map(item => ({
      menu: item.menu._id,
      menuName: item.menu.name,
      menuImage: item.menu.images && item.menu.images.length > 0 ? item.menu.images[0].url : '',
      quantity: item.quantity,
      size: item.size,
      price: item.priceAtTime,
      addons: item.addons,
      specialInstructions: item.specialInstructions,
      itemTotal: item.itemTotal
    }));

    // Create guest order using the unified Order model
    const guestOrder = new Order({
      user: guestUser._id, // Reference to guest user
      items: orderItems,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      orderType,
      timing,
      scheduledDate: timing === 'scheduled' ? new Date(scheduledDate) : undefined,
      scheduledTime: timing === 'scheduled' ? scheduledTime : undefined,
      subtotal,
      deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
      tax,
      discount,
      totalPrice: orderType === 'delivery' ? totalPrice : (subtotal + tax - discount),
      paymentMethod,
      specialInstructions,
      estimatedDeliveryTime: new Date(Date.now() + (cart.estimatedDeliveryTime || 30) * 60000) // Convert minutes to milliseconds
    });

    await guestOrder.save();

    // Update menu item quantities
    for (const item of cart.items) {
      await Menu.findByIdAndUpdate(
        item.menu._id,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Clear the cart after successful order
    cart.items = [];
    await cart.save();

    // Populate order for response
    await guestOrder.populate([
      { path: 'items.menu', select: 'name images category' },
      { path: 'user', select: 'name email phoneNumber role' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Guest order created successfully',
      data: {
        order: guestOrder,
        orderNumber: guestOrder.orderNumber
      }
    });
  } catch (error) {
    console.error('Create guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest order',
      error: error.message
    });
  }
};

/**
 * Get guest order by order number
 * GET /api/shop/guest/orders/:orderNumber
 */
const getGuestOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .populate([
        { path: 'user', select: 'name email phoneNumber role' },
        { path: 'items.menu', select: 'name images category' }
      ])
      .lean();

    // Check if it's a guest order
    if (!order || order.user?.role !== 'guest') {
      return res.status(404).json({
        success: false,
        message: 'Guest order not found'
      });
    }



    res.status(200).json({
      success: true,
      message: 'Guest order retrieved successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Get guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guest order',
      error: error.message
    });
  }
};

/**
 * Get guest orders by email
 * GET /api/shop/guest/orders/email/:email
 */
const getGuestOrdersByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Find guest user by email first
    const { getGuestUserByEmail } = require('../../services/guest-service');
    const guestUser = await getGuestUserByEmail(email);

    if (!guestUser) {
      return res.status(404).json({
        success: false,
        message: 'No guest orders found for this email'
      });
    }

    const orders = await Order.find({ user: guestUser._id })
      .populate([
        { path: 'user', select: 'name email phoneNumber role' },
        { path: 'items.menu', select: 'name images category' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const totalOrders = await Order.countDocuments({ user: guestUser._id });

    res.status(200).json({
      success: true,
      message: 'Guest orders retrieved successfully',
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalItems: totalOrders,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get guest orders by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guest orders',
      error: error.message
    });
  }
};

/**
 * Get guest orders by session ID
 * GET /api/shop/guest/orders/session/:sessionId
 */
const getGuestOrdersBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Find guest user by session ID first
    const { getGuestUserBySession } = require('../../services/guest-service');
    const guestUser = await getGuestUserBySession(sessionId);

    if (!guestUser) {
      return res.status(404).json({
        success: false,
        message: 'No guest orders found for this session'
      });
    }

    const orders = await Order.find({ user: guestUser._id })
      .populate([
        { path: 'user', select: 'name email phoneNumber role' },
        { path: 'items.menu', select: 'name images category' }
      ])
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Guest orders retrieved successfully',
      data: { orders }
    });
  } catch (error) {
    console.error('Get guest orders by session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guest orders',
      error: error.message
    });
  }
};

/**
 * Track guest order status
 * GET /api/shop/guest/orders/:orderNumber/track
 */
const trackGuestOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .populate('user', 'role')
      .select('orderNumber deliveryStatus paymentStatus estimatedDeliveryTime createdAt user')
      .lean();

    // Check if it's a guest order
    if (!order || order.user?.role !== 'guest') {
      return res.status(404).json({
        success: false,
        message: 'Guest order not found'
      });
    }



    // Calculate estimated delivery time remaining
    const now = new Date();
    const estimatedTime = new Date(order.estimatedDeliveryTime);
    const timeRemaining = estimatedTime > now ? Math.ceil((estimatedTime - now) / (1000 * 60)) : 0;

    res.status(200).json({
      success: true,
      message: 'Order tracking information retrieved successfully',
      data: {
        orderNumber: order.orderNumber,
        status: order.deliveryStatus,
        paymentStatus: order.paymentStatus,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        timeRemainingMinutes: timeRemaining,
        orderDate: order.createdAt
      }
    });
  } catch (error) {
    console.error('Track guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track guest order',
      error: error.message
    });
  }
};

module.exports = {
  createGuestOrder,
  getGuestOrder,
  getGuestOrdersByEmail,
  getGuestOrdersBySession,
  trackGuestOrder
};
