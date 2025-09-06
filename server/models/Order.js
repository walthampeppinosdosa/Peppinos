const mongoose = require('mongoose');

// Order item sub-schema
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  productName: {
    type: String,
    required: [true, 'Product name is required']
  },
  productImage: {
    type: String,
    required: [true, 'Product image is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large'],
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
    required: true
  },
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
    required: [true, 'Delivery address is required']
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
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'digital_wallet'],
    default: 'card'
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

// Indexes (orderNumber already has unique index from schema definition)
orderSchema.index({ user: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ deliveryStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'user': 1, 'createdAt': -1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
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
    return Math.max(total, item.product.preparationTime || 0);
  }, 0);
};

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
