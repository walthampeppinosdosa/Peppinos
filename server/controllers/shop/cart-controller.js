const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const { validationResult } = require('express-validator');

/**
 * Get user's cart
 * GET /api/shop/cart
 */
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name images discountedPrice mrp quantity isActive')
      .lean();

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
      cart = cart.toObject();
    }

    // Filter out inactive products and calculate totals
    const activeItems = cart.items.filter(item =>
      item.product && item.product.isActive && item.product.quantity > 0
    );

    const cartTotals = activeItems.reduce((totals, item) => {
      const itemTotal = item.quantity * item.product.discountedPrice;
      totals.subtotal += itemTotal;
      totals.totalItems += item.quantity;
      return totals;
    }, { subtotal: 0, totalItems: 0 });

    // Apply coupon discount if exists
    let discount = 0;
    if (cart.coupon && cart.coupon.isActive) {
      if (cart.coupon.type === 'percentage') {
        discount = (cartTotals.subtotal * cart.coupon.value) / 100;
      } else {
        discount = cart.coupon.value;
      }
      discount = Math.min(discount, cart.coupon.maxDiscount || discount);
    }

    const total = Math.max(0, cartTotals.subtotal - discount);

    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        cart: {
          ...cart,
          items: activeItems,
          totals: {
            subtotal: cartTotals.subtotal,
            discount,
            total,
            totalItems: cartTotals.totalItems
          }
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart',
      error: error.message
    });
  }
};

/**
 * Add item to cart
 * POST /api/shop/cart/items
 */
const addToCart = async (req, res) => {
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

    const { productId, quantity = 1, size = 'Medium', addons = [] } = req.body;

    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    // Check stock availability
    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} items available in stock`
      });
    }

    // Validate size
    if (!product.sizes.includes(size)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid size selected'
      });
    }

    // Validate addons
    const validAddons = addons.filter(addon =>
      product.addons.some(productAddon =>
        productAddon._id.toString() === addon.id && addon.quantity > 0
      )
    );

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item =>
      item.product.toString() === productId &&
      item.size === size &&
      JSON.stringify(item.addons.sort()) === JSON.stringify(validAddons.sort())
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > product.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more items. Maximum available: ${product.quantity}`
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity,
        size,
        addons: validAddons
      });
    }

    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product', 'name images discountedPrice mrp');

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message
    });
  }
};

/**
 * Update cart item quantity
 * PUT /api/shop/cart/items/:itemId
 */
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check product availability
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is no longer available'
      });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} items available in stock`
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product', 'name images discountedPrice mrp');

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message
    });
  }
};

/**
 * Remove item from cart
 * DELETE /api/shop/cart/items/:itemId
 */
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product', 'name images discountedPrice mrp');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
};

/**
 * Clear entire cart
 * DELETE /api/shop/cart
 */
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    cart.coupon = null;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
};

/**
 * Apply coupon to cart
 * POST /api/shop/cart/coupon
 */
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // For now, we'll simulate coupon validation
    // In a real app, you'd have a Coupon model
    const validCoupons = {
      'SAVE10': { type: 'percentage', value: 10, minOrder: 100, maxDiscount: 50 },
      'FLAT20': { type: 'fixed', value: 20, minOrder: 200, maxDiscount: 20 },
      'WELCOME15': { type: 'percentage', value: 15, minOrder: 150, maxDiscount: 75 }
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Calculate cart subtotal
    await cart.populate('items.product', 'discountedPrice');
    const subtotal = cart.items.reduce((total, item) =>
      total + (item.quantity * item.product.discountedPrice), 0
    );

    if (subtotal < coupon.minOrder) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrder} required for this coupon`
      });
    }

    cart.coupon = {
      code: couponCode.toUpperCase(),
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount,
      isActive: true
    };

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon',
      error: error.message
    });
  }
};

/**
 * Remove coupon from cart
 * DELETE /api/shop/cart/coupon
 */
const removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.coupon = null;
    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product', 'name images discountedPrice mrp');

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove coupon',
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon
};
