const { validationResult } = require('express-validator');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Menu = require('../../models/Menu');
const { getOrCreateGuestUser, getGuestUserBySession } = require('../../services/guest-service');
const { sendEmail } = require('../../helpers/send-email');

// Helper function to emit Socket.IO events
const emitOrderEvent = (eventType, data) => {
  try {
    if (global.io) {
      // Emit to all admin rooms with correct room names
      global.io.to('admin:all').emit(eventType, data);
      global.io.to('admin:super-admin').emit(eventType, data);  // Fixed: was 'admin:superadmin'
      global.io.to('admin:veg_admin').emit(eventType, data);
      global.io.to('admin:non_veg_admin').emit(eventType, data);


    }
  } catch (error) {
    console.error('❌ Error emitting Socket.IO event:', error);
  }
};

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

    // Add customer type information
    const orderWithCustomerType = {
      ...guestOrder.toObject(),
      customerType: 'guest',
      isGuestOrder: true
    };

    // Emit Socket.IO event for new guest order
    emitOrderEvent('orderCreated', orderWithCustomerType);

    // Send confirmation emails
    try {
      await sendGuestOrderConfirmationEmails(guestOrder);
    } catch (emailError) {
      console.error('Failed to send guest order confirmation emails:', emailError);
      // Don't fail the order creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Guest order created successfully',
      data: {
        order: orderWithCustomerType,
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

/**
 * Send guest order confirmation emails to customer and admin
 */
const sendGuestOrderConfirmationEmails = async (order) => {
  const customerEmail = order.user.email;
  const customerName = order.user.name;
  const adminEmail = process.env.ADMIN_EMAIL || 'walthampeppinosdosa@gmail.com';



  // Format order items for email
  const itemsHtml = order.items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; text-align: left;">${item.menu.name}</td>
      <td style="padding: 10px; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; text-align: center;">${item.size || 'Regular'}</td>
      <td style="padding: 10px; text-align: right;">$${item.itemTotal.toFixed(2)}</td>
    </tr>
  `).join('');

  // Customer confirmation email
  const customerSubject = `Order Confirmation - #${order.orderNumber}`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Peppino's Dosa</h1>
          <div style="width: 50px; height: 3px; background-color: #d4af37; margin: 10px auto;"></div>
          <h2 style="color: #333; margin: 10px 0;">Order Confirmation</h2>
        </div>

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #2e7d32; margin: 0;">Thank you for your order, ${customerName}!</h3>
          <p style="color: #2e7d32; margin: 10px 0;">Order #${order.orderNumber}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span><strong>Order Type:</strong></span>
            <span style="text-transform: capitalize;">${order.orderType}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span><strong>Timing:</strong></span>
            <span style="text-transform: capitalize;">${order.timing}</span>
          </div>
          ${order.deliveryAddress ? `
            <div style="margin: 15px 0;">
              <strong>Delivery Address:</strong><br>
              ${order.deliveryAddress.street}<br>
              ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}
            </div>
          ` : ''}
          <hr style="margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 18px; font-weight: bold; color: #d4af37;">
            <span>Total:</span>
            <span>$${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        ${order.specialInstructions ? `
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <strong>Special Instructions:</strong><br>
            <em>${order.specialInstructions}</em>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #d1ecf1; border-radius: 8px;">
          <p style="color: #0c5460; margin: 0; font-weight: bold;">We're preparing your order with care!</p>
          <p style="color: #0c5460; margin: 10px 0;">Estimated preparation time: 25-35 minutes</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px;">
            Questions about your order? Contact us at:<br>
            <strong>Phone:</strong> (781) 547-6099<br>
            <strong>Email:</strong> walthampeppinosdosa@gmail.com<br>
            <strong>Address:</strong> 434 Moody St, Waltham, MA 02453
          </p>
        </div>
      </div>
    </div>
  `;

  // Admin notification email
  const adminSubject = `New Guest Order Received - #${order.orderNumber}`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Peppino's Dosa</h1>
          <div style="width: 50px; height: 3px; background-color: #d4af37; margin: 10px auto;"></div>
          <h2 style="color: #333; margin: 10px 0;">New Guest Order Alert</h2>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin: 0;">Order #${order.orderNumber}</h3>
          <p style="color: #856404; margin: 10px 0;"><strong>Guest Customer:</strong> ${customerName}</p>
          <p style="color: #856404; margin: 5px 0;"><strong>Email:</strong> ${customerEmail}</p>
          <p style="color: #856404; margin: 5px 0;"><strong>Phone:</strong> ${order.user.phoneNumber || 'Not provided'}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span><strong>Order Type:</strong></span>
            <span style="text-transform: capitalize;">${order.orderType}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span><strong>Timing:</strong></span>
            <span style="text-transform: capitalize;">${order.timing}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span><strong>Payment Method:</strong></span>
            <span style="text-transform: capitalize;">${order.paymentMethod.replace('_', ' ')}</span>
          </div>
          ${order.deliveryAddress ? `
            <div style="margin: 15px 0;">
              <strong>Delivery Address:</strong><br>
              ${order.deliveryAddress.street}<br>
              ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}<br>
              <strong>Phone:</strong> ${order.deliveryAddress.phoneNumber}
            </div>
          ` : ''}
          <hr style="margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 18px; font-weight: bold; color: #d4af37;">
            <span>Total:</span>
            <span>$${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        ${order.specialInstructions ? `
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <strong>Special Instructions:</strong><br>
            <em>${order.specialInstructions}</em>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #d1ecf1; border-radius: 8px;">
          <p style="color: #0c5460; margin: 0; font-weight: bold;">Please process this guest order promptly!</p>
        </div>
      </div>
    </div>
  `;

  // Send emails
  const emailPromises = [
    sendEmail({
      to: customerEmail,
      subject: customerSubject,
      html: customerHtml
    }),
    sendEmail({
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml
    })
  ];

  await Promise.all(emailPromises);
};

module.exports = {
  createGuestOrder,
  getGuestOrder,
  getGuestOrdersByEmail,
  getGuestOrdersBySession,
  trackGuestOrder
};
