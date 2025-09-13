const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Menu = require('../../models/Menu');
const { generateOrderNumber } = require('../../utils/orderUtils');

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
      specialInstructions,
      items,
      subtotal,
      tax,
      total,
      sessionId
    } = req.body;

    // Validate required fields
    if (!customerInfo || !customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: 'Customer information is required'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
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

    // Validate menu items and calculate totals
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menu = await Menu.findById(item.menu);
      if (!menu) {
        return res.status(400).json({
          success: false,
          message: `Menu item not found: ${item.menu}`
        });
      }

      // Calculate item total
      let itemPrice = menu.discountedPrice || menu.price;
      let addonsTotal = 0;

      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          addonsTotal += addon.price || 0;
        }
      }

      const itemTotal = (itemPrice + addonsTotal) * item.quantity;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        menu: item.menu,
        quantity: item.quantity,
        size: item.size || 'Medium',
        addons: item.addons || [],
        specialInstructions: item.specialInstructions || '',
        itemTotal: itemTotal
      });
    }

    // Validate totals
    const calculatedTax = Math.round(calculatedSubtotal * 0.07 * 100) / 100; // 7% tax
    const calculatedTotal = calculatedSubtotal + calculatedTax;

    if (Math.abs(calculatedSubtotal - subtotal) > 0.01 ||
        Math.abs(calculatedTax - tax) > 0.01 ||
        Math.abs(calculatedTotal - total) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Order totals do not match calculated values'
      });
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order object
    const orderData = {
      orderNumber,
      customerInfo,
      orderType,
      timing: timing || 'asap',
      paymentMethod: paymentMethod || 'pay_online',
      specialInstructions: specialInstructions || '',
      items: validatedItems,
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      total: calculatedTotal,
      status: 'pending',
      paymentStatus: 'pending'
    };

    // Add user if authenticated
    if (req.user) {
      orderData.user = req.user._id;
    } else {
      // For guest orders, store session ID
      orderData.guestSessionId = sessionId;
    }

    // Add delivery address for delivery orders
    if (orderType === 'delivery') {
      orderData.deliveryAddress = deliveryAddress;
    }

    // Add scheduled time for scheduled orders
    if (timing === 'scheduled') {
      orderData.scheduledDate = new Date(scheduledDate);
      orderData.scheduledTime = scheduledTime;
    }

    // Create the order
    const order = new Order(orderData);
    await order.save();

    // Populate menu details for response
    await order.populate('items.menu');

    // Clear cart if user is authenticated
    if (req.user) {
      await Cart.findOneAndDelete({ user: req.user._id });
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

module.exports = {
  createOrder
};
