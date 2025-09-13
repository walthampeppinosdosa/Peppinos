const Order = require('../models/Order');

/**
 * Generate a unique order number
 * Format: PEP-YYYYMMDD-XXXX (e.g., PEP-20241215-0001)
 */
const generateOrderNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Find the highest order number for today
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  const lastOrder = await Order.findOne({
    createdAt: {
      $gte: todayStart,
      $lt: todayEnd
    }
  }).sort({ orderNumber: -1 });

  let sequence = 1;
  if (lastOrder && lastOrder.orderNumber) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  const sequenceStr = sequence.toString().padStart(4, '0');
  return `PEP-${dateStr}-${sequenceStr}`;
};

/**
 * Calculate estimated delivery/pickup time
 */
const calculateEstimatedTime = (orderType, timing, scheduledDate, scheduledTime) => {
  if (timing === 'scheduled' && scheduledDate && scheduledTime) {
    const [hours, minutes] = scheduledTime.split(':');
    const estimatedTime = new Date(scheduledDate);
    estimatedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return estimatedTime;
  }

  // For ASAP orders
  const now = new Date();
  const preparationTime = orderType === 'delivery' ? 45 : 20; // minutes
  return new Date(now.getTime() + preparationTime * 60 * 1000);
};

/**
 * Validate order timing against business hours
 */
const validateOrderTiming = (timing, scheduledDate, scheduledTime, orderType) => {
  // Business hours (simplified - should match frontend)
  const businessHours = {
    0: { open: '11:30', close: '22:00' }, // Sunday
    1: { open: '11:30', close: '22:00' }, // Monday
    2: { open: '11:30', close: '22:00' }, // Tuesday
    3: { open: '11:30', close: '22:00' }, // Wednesday
    4: { open: '11:30', close: '22:00' }, // Thursday
    5: { open: '11:30', close: '22:30' }, // Friday
    6: { open: '11:30', close: '22:30' }  // Saturday
  };

  if (timing === 'asap') {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    const hours = businessHours[dayOfWeek];
    
    if (!hours || currentTime < hours.open || currentTime > hours.close) {
      return {
        valid: false,
        message: 'Restaurant is currently closed. Please schedule your order for later.'
      };
    }
    
    return { valid: true };
  }

  if (timing === 'scheduled') {
    if (!scheduledDate || !scheduledTime) {
      return {
        valid: false,
        message: 'Scheduled date and time are required.'
      };
    }

    const orderDate = new Date(scheduledDate);
    const dayOfWeek = orderDate.getDay();
    const hours = businessHours[dayOfWeek];
    
    if (!hours || scheduledTime < hours.open || scheduledTime > hours.close) {
      return {
        valid: false,
        message: 'Selected time is outside business hours.'
      };
    }

    // Check if scheduled time is in the future
    const now = new Date();
    const scheduledDateTime = new Date(scheduledDate + 'T' + scheduledTime);
    const preparationTime = orderType === 'delivery' ? 45 : 20; // minutes
    const minTime = new Date(now.getTime() + preparationTime * 60 * 1000);

    if (scheduledDateTime < minTime) {
      return {
        valid: false,
        message: `Scheduled time must be at least ${preparationTime} minutes from now.`
      };
    }

    return { valid: true };
  }

  return {
    valid: false,
    message: 'Invalid timing option.'
  };
};

/**
 * Calculate delivery fee based on distance/zone
 */
const calculateDeliveryFee = (deliveryAddress) => {
  // Simplified delivery fee calculation
  // In a real app, this would integrate with a mapping service
  
  const baseDeliveryFee = 3.99;
  const freeDeliveryThreshold = 25.00;
  
  return {
    fee: baseDeliveryFee,
    freeDeliveryThreshold,
    description: 'Standard delivery fee'
  };
};

/**
 * Format order for email/SMS notifications
 */
const formatOrderForNotification = (order) => {
  const items = order.items.map(item => {
    const menu = item.menu;
    let itemText = `${item.quantity}x ${menu.name}`;
    
    if (item.size && item.size !== 'Medium') {
      itemText += ` (${item.size})`;
    }
    
    if (item.addons && item.addons.length > 0) {
      itemText += ` + ${item.addons.map(addon => addon.name).join(', ')}`;
    }
    
    return itemText;
  }).join('\n');

  const estimatedTime = calculateEstimatedTime(
    order.orderType,
    order.timing,
    order.scheduledDate,
    order.scheduledTime
  );

  return {
    orderNumber: order.orderNumber,
    customerName: order.customerInfo.name,
    customerPhone: order.customerInfo.phone,
    customerEmail: order.customerInfo.email,
    orderType: order.orderType,
    items: items,
    total: order.total,
    estimatedTime: estimatedTime,
    specialInstructions: order.specialInstructions
  };
};

/**
 * Get order status display text
 */
const getOrderStatusDisplay = (status) => {
  const statusMap = {
    'pending': 'Order Received',
    'confirmed': 'Order Confirmed',
    'preparing': 'Preparing Your Order',
    'ready': 'Ready for Pickup',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };

  return statusMap[status] || status;
};

module.exports = {
  generateOrderNumber,
  calculateEstimatedTime,
  validateOrderTiming,
  calculateDeliveryFee,
  formatOrderForNotification,
  getOrderStatusDisplay
};
