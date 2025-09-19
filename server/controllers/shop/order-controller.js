const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Menu = require('../../models/Menu');
const { generateOrderNumber } = require('../../utils/orderUtils');
const { sendEmail } = require('../../helpers/send-email');

/**
 * Create a new order (guest or authenticated user)
 */
const createOrder = async (req, res) => {
  try {
    const {
      customerInfo,
      orderType,
      timing,
      scheduledDate,
      scheduledTime,
      deliveryAddress,
      paymentMethod,
      specialInstructions
    } = req.body;

    // Debug logging
    console.log('🔍 Order creation request body:', {
      customerInfo,
      hasCustomerInfo: !!customerInfo,
      customerInfoKeys: customerInfo ? Object.keys(customerInfo) : [],
      userId: req.user?.id || req.user?._id,
      isAuthenticated: !!req.user
    });

    // Check if this is a guest user (no req.user means guest)
    if (!req.user) {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is for authenticated users only. Guest users should use /api/shop/guest/checkout'
      });
    }

    // Validate required fields (phone is optional)
    if (!customerInfo || !customerInfo.name || !customerInfo.email) {
      console.error('❌ Customer info validation failed:', {
        customerInfo,
        hasName: !!(customerInfo?.name),
        hasPhone: !!(customerInfo?.phone),
        hasEmail: !!(customerInfo?.email)
      });
      return res.status(400).json({
        success: false,
        message: 'Customer name and email are required'
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.menu');
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty or not found'
      });
    }

    if (!orderType || !['pickup', 'delivery'].includes(orderType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid order type is required'
      });
    }

    // Validate delivery address for delivery orders
    if (orderType === 'delivery') {
      if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city ||
          !deliveryAddress.state || !deliveryAddress.zipCode) {
        return res.status(400).json({
          success: false,
          message: 'Complete delivery address is required for delivery orders'
        });
      }
    }

    // Validate scheduled time for scheduled orders
    if (timing === 'scheduled') {
      if (!scheduledDate || !scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date and time are required for scheduled orders'
        });
      }
    }

    // Validate cart items and check stock
    for (const item of cart.items) {
      const menuItem = item.menu;
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item not found in cart`
        });
      }

      // Check stock availability
      if (menuItem.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${menuItem.quantity} of "${menuItem.name}" available in stock`
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

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order using the unified Order model
    const order = new Order({
      user: req.user.id,
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

    await order.save();

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
    await order.populate([
      {
        path: 'user',
        select: 'name email phoneNumber role'
      },
      {
        path: 'items.menu',
        select: 'name category images discountPercentage availabilityStatus'
      }
    ]);

    // Send confirmation emails
    try {
      console.log('📧 Attempting to send order confirmation emails for order:', order.orderNumber);
      await sendOrderConfirmationEmails(order);
      console.log('✅ Order confirmation emails sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send confirmation emails:', emailError);
      // Don't fail the order creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: order
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Send order confirmation emails to customer and admin
 */
const sendOrderConfirmationEmails = async (order) => {
  const customerEmail = order.user?.email;
  const customerName = order.user?.name;
  const adminEmail = process.env.ADMIN_EMAIL || 'walthampeppinosdosa@gmail.com';

  console.log('📧 Preparing order confirmation emails:', {
    customerEmail,
    customerName,
    adminEmail,
    orderNumber: order.orderNumber
  });

  // Format order items for email
  const itemsHtml = order.items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; text-align: left;">${item.menu?.name || item.menuName || 'Menu Item'}</td>
      <td style="padding: 10px; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; text-align: center;">${item.size || 'Regular'}</td>
      <td style="padding: 10px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  // Format delivery address if applicable
  const deliveryAddressHtml = order.orderType === 'delivery' && order.deliveryAddress ? `
    <div style="margin: 15px 0;">
      <strong>Delivery Address:</strong><br>
      ${order.deliveryAddress.street}<br>
      ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}
    </div>
  ` : '';

  // Format scheduled time if applicable
  const scheduledTimeHtml = order.timing === 'scheduled' ? `
    <div style="margin: 15px 0;">
      <strong>Scheduled for:</strong> ${new Date(order.scheduledDate).toLocaleDateString()} at ${order.scheduledTime}
    </div>
  ` : '';

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

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Thank you for your order, ${customerName}!</h3>
          <p style="margin: 10px 0;"><strong>Order Number:</strong> #${order.orderNumber}</p>
          <p style="margin: 10px 0;"><strong>Order Type:</strong> ${order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}</p>
          <p style="margin: 10px 0;"><strong>Status:</strong> ${order.status}</p>
          ${deliveryAddressHtml}
          ${scheduledTimeHtml}
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Order Details:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Subtotal:</span>
            <span>$${order.subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Tax:</span>
            <span>$${order.tax.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 15px 0 5px 0; padding-top: 10px; border-top: 1px solid #dee2e6; font-weight: bold; font-size: 18px;">
            <span>Total:</span>
            <span style="color: #d4af37;">$${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        ${order.specialInstructions ? `
          <div style="margin: 20px 0;">
            <strong>Special Instructions:</strong><br>
            <em>${order.specialInstructions}</em>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; margin: 10px 0;">We're preparing your order with care!</p>
          <p style="color: #666; margin: 10px 0;">You'll receive updates as your order progresses.</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; margin: 5px 0;">
            <strong>Peppino's Dosa</strong><br>
            434 Moody St, Waltham, MA 02453<br>
            (781) 547-6099<br>
            walthampeppinosdosa@gmail.com
          </p>
        </div>
      </div>
    </div>
  `;

  // Admin notification email
  const adminSubject = `New Order Received - #${order.orderNumber}`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Peppino's Dosa</h1>
          <div style="width: 50px; height: 3px; background-color: #d4af37; margin: 10px auto;"></div>
          <h2 style="color: #333; margin: 10px 0;">New Order Alert</h2>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Order #${order.orderNumber}</h3>
          <p style="margin: 10px 0;"><strong>Customer:</strong> ${customerName}</p>
          <p style="margin: 10px 0;"><strong>Phone:</strong> ${order.user?.phoneNumber || 'N/A'}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${customerEmail}</p>
          <p style="margin: 10px 0;"><strong>Order Type:</strong> ${order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}</p>
          <p style="margin: 10px 0;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          ${deliveryAddressHtml}
          ${scheduledTimeHtml}
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Order Items:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Subtotal:</span>
            <span>$${order.subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Tax:</span>
            <span>$${order.tax.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 15px 0 5px 0; padding-top: 10px; border-top: 1px solid #dee2e6; font-weight: bold; font-size: 18px;">
            <span>Total:</span>
            <span style="color: #d4af37;">$${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        ${order.specialInstructions ? `
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <strong>Special Instructions:</strong><br>
            <em>${order.specialInstructions}</em>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #d1ecf1; border-radius: 8px;">
          <p style="color: #0c5460; margin: 0; font-weight: bold;">Please process this order promptly!</p>
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
  createOrder
};
