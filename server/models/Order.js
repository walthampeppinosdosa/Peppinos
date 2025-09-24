const mongoose = require('mongoose');

// Order item sub-schema
const orderItemSchema = new mongoose.Schema({
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: [true, 'Menu item is required']
  },
  menuName: {
    type: String,
    required: [true, 'Menu name is required']
  },
  menuImage: {
    type: String,
    required: [true, 'Menu image is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large', 'Regular'],
    default: 'Medium'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  addons: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [200, 'Special instructions cannot exceed 200 characters']
  },
  itemTotal: {
    type: Number,
    required: [true, 'Item total is required'],
    min: [0, 'Item total cannot be negative']
  }
}, { _id: true });

// Address sub-schema for order
const orderAddressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    default: 'United States'
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: false, // Will be set in pre-save hook
    default: null
  },
  // User reference (works for both regular customers and guest users)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  deliveryAddress: {
    type: orderAddressSchema,
    required: function() {
      return this.orderType === 'delivery';
    },
    validate: {
      validator: function(value) {
        // Only validate if orderType is delivery
        if (this.orderType === 'delivery') {
          return value != null;
        }
        return true;
      },
      message: 'Delivery address is required for delivery orders'
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: [0, 'Delivery fee cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  // Order type: pickup or delivery
  orderType: {
    type: String,
    enum: ['pickup', 'delivery'],
    required: [true, 'Order type is required'],
    default: 'delivery'
  },
  // Timing: ASAP or scheduled
  timing: {
    type: String,
    enum: ['asap', 'scheduled'],
    required: [true, 'Timing is required'],
    default: 'asap'
  },
  // Scheduled date and time (only for scheduled orders)
  scheduledDate: {
    type: Date,
    required: function() {
      return this.timing === 'scheduled';
    }
  },
  scheduledTime: {
    type: String, // Format: "HH:MM" (e.g., "14:30")
    required: function() {
      return this.timing === 'scheduled';
    },
    validate: {
      validator: function(time) {
        if (this.timing !== 'scheduled') return true;
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Scheduled time must be in HH:MM format'
    }
  },
  paymentMethod: {
    type: String,
    enum: ['pay_online'],
    required: [true, 'Payment method is required'],
    default: 'pay_online'
  },
  stripePaymentIntentId: {
    type: String
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  cancelReason: {
    type: String,
    trim: true
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  }
}, {
  timestamps: true
});

// Custom validation
orderSchema.pre('validate', function(next) {
  // For pickup orders, delivery address is not required
  if (this.orderType === 'pickup') {
    this.deliveryAddress = undefined;
  }

  next();
});

// Indexes (orderNumber already has unique index from schema definition)
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ deliveryStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'user': 1, 'createdAt': -1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const count = await this.constructor.countDocuments();
      // Check if user is a guest by populating the user field
      await this.populate('user', 'role');
      const prefix = this.user?.role === 'guest' ? 'GUEST' : 'ORD';
      this.orderNumber = `${prefix}-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error in order pre-save hook:', error);
      return next(error);
    }
  }

  // Validate that orderNumber is set
  if (!this.orderNumber) {
    return next(new Error('Order number must be generated'));
  }

  next();
});

// Virtual for order status display
orderSchema.virtual('statusDisplay').get(function() {
  if (this.deliveryStatus === 'cancelled') {
    return 'Cancelled';
  }
  if (this.paymentStatus === 'failed') {
    return 'Payment Failed';
  }
  if (this.paymentStatus === 'pending') {
    return 'Payment Pending';
  }

  const statusMap = {
    'pending': 'Order Placed',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready': 'Ready for Pickup',
    'out-for-delivery': 'Out for Delivery',
    'delivered': 'Delivered'
  };

  return statusMap[this.deliveryStatus] || this.deliveryStatus;
});

// Method to calculate total preparation time
orderSchema.methods.calculatePreparationTime = function() {
  return this.items.reduce((total, item) => {
    return Math.max(total, item.menu.preparationTime || 0);
  }, 0);
};

// Static method to find guest orders by email
orderSchema.statics.findGuestOrdersByEmail = function(email) {
  return this.find({ user: { $exists: true } })
    .populate({
      path: 'user',
      match: { role: 'guest', email: email }
    })
    .then(orders => orders.filter(order => order.user)) // Filter out orders where user didn't match
    .sort({ createdAt: -1 });
};

// Static method to find guest orders by session ID
orderSchema.statics.findGuestOrdersBySession = function(sessionId) {
  return this.find({ user: { $exists: true } })
    .populate({
      path: 'user',
      match: { role: 'guest', sessionId: sessionId }
    })
    .then(orders => orders.filter(order => order.user)) // Filter out orders where user didn't match
    .sort({ createdAt: -1 });
};

// Virtual to identify order type
orderSchema.virtual('isGuestOrder').get(function() {
  return this.user?.role === 'guest';
});

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' },
        guestOrders: {
          $sum: { $cond: [{ $eq: ['$user.role', 'guest'] }, 1, 0] }
        },
        userOrders: {
          $sum: { $cond: [{ $ne: ['$user.role', 'guest'] }, 1, 0] }
        },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'pending'] }, 1, 0] }
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Ensure virtuals are included in JSON output
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
