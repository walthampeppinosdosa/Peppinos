const mongoose = require('mongoose');

// Cart item sub-schema
const cartItemSchema = new mongoose.Schema({
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: [true, 'Menu item is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Quantity cannot exceed 10']
  },
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large', 'Regular'],
    default: 'Medium'
  },
  addons: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Addon price cannot be negative']
    }
  }],
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [200, 'Special instructions cannot exceed 200 characters']
  },
  priceAtTime: {
    type: Number,
    required: [true, 'Price at time is required'],
    min: [0, 'Price cannot be negative']
  },
  itemTotal: {
    type: Number,
    required: [true, 'Item total is required'],
    min: [0, 'Item total cannot be negative']
  }
}, {
  timestamps: true,
  _id: true
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  items: {
    type: [cartItemSchema],
    default: []
  },
  subtotal: {
    type: Number,
    default: 0,
    min: [0, 'Subtotal cannot be negative']
  },
  totalItems: {
    type: Number,
    default: 0,
    min: [0, 'Total items cannot be negative']
  },
  estimatedDeliveryTime: {
    type: Number, // in minutes
    default: 30
  },
  appliedCoupon: {
    code: String,
    discount: {
      type: Number,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      min: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
cartSchema.index({ user: 1 }, { unique: true });
cartSchema.index({ 'items.menu': 1 });
cartSchema.index({ updatedAt: -1 });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((total, item) => total + item.itemTotal, 0);
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);

    // Calculate estimated delivery time (max preparation time + delivery buffer)
    this.estimatedDeliveryTime = Math.max(
      ...this.items.map(item => item.menu?.preparationTime || 20)
    ) + 15; // 15 minutes delivery buffer
  } else {
    this.subtotal = 0;
    this.totalItems = 0;
    this.estimatedDeliveryTime = 30;
  }
  next();
});

// Method to add item to cart
cartSchema.methods.addItem = function(menuId, quantity, size, addons, specialInstructions, price) {
  const existingItemIndex = this.items.findIndex(item =>
    item.menu.toString() === menuId.toString() &&
    item.size === size &&
    JSON.stringify(item.addons) === JSON.stringify(addons)
  );

  const addonTotal = addons.reduce((total, addon) => total + addon.price, 0);
  const itemTotal = (price + addonTotal) * quantity;

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].itemTotal =
      (price + addonTotal) * this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    this.items.push({
      menu: menuId,
      quantity,
      size,
      addons,
      specialInstructions,
      priceAtTime: price,
      itemTotal
    });
  }

  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    this.items.pull(itemId);
  } else {
    item.quantity = quantity;
    const addonTotal = item.addons.reduce((total, addon) => total + addon.price, 0);
    item.itemTotal = (item.priceAtTime + addonTotal) * quantity;
  }

  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
  return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedCoupon = undefined;
  return this.save();
};

// Method to apply coupon
cartSchema.methods.applyCoupon = function(couponCode, discountPercentage) {
  const discountAmount = (this.subtotal * discountPercentage) / 100;
  this.appliedCoupon = {
    code: couponCode,
    discount: discountPercentage,
    discountAmount
  };
  return this.save();
};

// Virtual for final total (after discount)
cartSchema.virtual('finalTotal').get(function() {
  let total = this.subtotal;
  if (this.appliedCoupon && this.appliedCoupon.discountAmount) {
    total -= this.appliedCoupon.discountAmount;
  }
  return Math.max(total, 0);
});

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId }).populate('items.menu');
  if (!cart) {
    cart = new this({ user: userId });
    await cart.save();
  }
  return cart;
};

// Static method to cleanup old guest carts (older than 7 days)
cartSchema.statics.cleanupOldGuestCarts = async function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find guest users with old carts
  const User = require('./User');
  const oldGuestUsers = await User.find({
    role: 'guest',
    updatedAt: { $lt: sevenDaysAgo }
  }).select('_id');

  const oldGuestUserIds = oldGuestUsers.map(user => user._id);

  // Delete old guest carts
  const result = await this.deleteMany({ user: { $in: oldGuestUserIds } });

  // Delete old guest users
  await User.deleteMany({ _id: { $in: oldGuestUserIds } });

  return result;
};

// Ensure virtuals are included in JSON output
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
