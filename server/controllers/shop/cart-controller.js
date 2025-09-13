const Cart = require('../../models/Cart');
const Menu = require('../../models/Menu');
const { validationResult } = require('express-validator');

/**
 * Get user's cart
 * GET /api/shop/cart
 */
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.menu', 'name images discountedPrice mrp quantity isActive')
      .lean();

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
      cart = cart.toObject();
    }

    // Filter out inactive menu items and calculate totals
    const activeItems = cart.items.filter(item =>
      item.menu && item.menu.isActive && item.menu.quantity > 0
    );

    const cartTotals = activeItems.reduce((totals, item) => {
      totals.subtotal += item.itemTotal || 0;
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

    const { menuItemId, quantity = 1, size = 'Medium', addons = [], specialInstructions = '' } = req.body;

    // Verify menu item exists and is active
    const menuItem = await Menu.findById(menuItemId);
    if (!menuItem || !menuItem.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found or inactive'
      });
    }

    // Check stock availability
    if (menuItem.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${menuItem.quantity} items available in stock`
      });
    }

    // Validate size - be flexible with size validation
    let sizeInfo = null;
    let actualSize = size;

    if (menuItem.sizes && menuItem.sizes.length > 0) {
      // Handle both string array and object array formats
      if (typeof menuItem.sizes[0] === 'string') {
        // String array format
        if (menuItem.sizes.includes(size)) {
          sizeInfo = { name: size, price: menuItem.discountedPrice };
        } else {
          // Use first available size
          actualSize = menuItem.sizes[0];
          sizeInfo = { name: actualSize, price: menuItem.discountedPrice };
          console.log(`Size "${size}" not found for menu item ${menuItem.name}, using "${actualSize}" instead`);
        }
      } else {
        // Object array format
        sizeInfo = menuItem.sizes.find(s => s.name === size);
        if (!sizeInfo) {
          // Try to find default size or use first available
          sizeInfo = menuItem.sizes.find(s => s.isDefault) || menuItem.sizes[0];
          actualSize = sizeInfo.name;
          console.log(`Size "${size}" not found for menu item ${menuItem.name}, using "${actualSize}" instead`);
        }
      }
    } else {
      // If no sizes defined, create a default size with the menu item's discounted price
      sizeInfo = {
        name: size,
        price: menuItem.discountedPrice || menuItem.mrp || 0,
        isDefault: true
      };
      console.log(`No sizes defined for menu item ${menuItem.name}, using default price`);
    }

    // Ensure we have a valid price
    const basePrice = sizeInfo.price || menuItem.discountedPrice || menuItem.mrp || 0;
    if (basePrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid price for menu item'
      });
    }

    // Validate and process addons
    const validAddons = addons ? addons.map(addon => {
      const menuItemAddon = menuItem.addons.find(menuAddon =>
        menuAddon._id.toString() === addon.id
      );

      if (!menuItemAddon || !addon.quantity || addon.quantity <= 0) {
        return null;
      }

      return {
        name: menuItemAddon.name,
        price: menuItemAddon.price,
        quantity: addon.quantity
      };
    }).filter(addon => addon !== null) : [];

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Helper function to compare addons
    const compareAddons = (addons1, addons2) => {
      if (addons1.length !== addons2.length) return false;

      const sorted1 = addons1.sort((a, b) => a.name.localeCompare(b.name));
      const sorted2 = addons2.sort((a, b) => a.name.localeCompare(b.name));

      return sorted1.every((addon1, index) => {
        const addon2 = sorted2[index];
        return addon1.name === addon2.name &&
               addon1.price === addon2.price &&
               addon1.quantity === addon2.quantity;
      });
    };

    // Check if item already exists in cart with same configuration
    const existingItemIndex = cart.items.findIndex(item =>
      item.menu.toString() === menuItemId &&
      item.size === actualSize &&
      (item.specialInstructions || '') === (specialInstructions || '') &&
      compareAddons(item.addons || [], validAddons)
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > menuItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more items. Maximum available: ${menuItem.quantity}`
        });
      }

      // Recalculate pricing for updated quantity using size price
      const addonsTotal = validAddons.reduce((total, addon) => total + (addon.price * addon.quantity), 0);
      const priceAtTime = basePrice;
      const itemTotal = (basePrice + addonsTotal) * newQuantity;

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].priceAtTime = priceAtTime;
      cart.items[existingItemIndex].itemTotal = itemTotal;
    } else {
      // Calculate pricing using size price
      const addonsTotal = validAddons.reduce((total, addon) => total + (addon.price * addon.quantity), 0);
      const priceAtTime = basePrice;
      const itemTotal = (basePrice + addonsTotal) * quantity;

      // Add new item to cart
      cart.items.push({
        menu: menuItemId,
        quantity,
        size: actualSize,
        addons: validAddons,
        specialInstructions: specialInstructions || '',
        priceAtTime,
        itemTotal
      });
    }

    // Handle version conflicts with retry logic
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await cart.save();
        break; // Success, exit retry loop
      } catch (saveError) {
        if (saveError.name === 'VersionError' && retryCount < maxRetries - 1) {
          retryCount++;
          console.log(`Version conflict, retrying... (${retryCount}/${maxRetries})`);

          // Reload the cart to get the latest version
          cart = await Cart.findById(cart._id);
          if (!cart) {
            throw new Error('Cart not found during retry');
          }

          // Re-apply the changes
          const existingItemIndex = cart.items.findIndex(item =>
            item.menu.toString() === menuItemId &&
            item.size === actualSize &&
            JSON.stringify(item.addons.sort()) === JSON.stringify(validAddons.sort())
          );

          if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].itemTotal = (basePrice + addonsTotal) * cart.items[existingItemIndex].quantity;
          } else {
            cart.items.push({
              menu: menuItemId,
              quantity,
              size: actualSize,
              addons: validAddons,
              priceAtTime: basePrice,
              itemTotal: (basePrice + addonsTotal) * quantity
            });
          }

          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw saveError; // Re-throw if not a version error or max retries reached
        }
      }
    }

    // Populate and return updated cart
    await cart.populate('items.menu', 'name images discountedPrice mrp');

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Add to cart error:', error);

    // Send specific error message to frontend
    let errorMessage = 'Failed to add item to cart';
    if (error.name === 'VersionError') {
      errorMessage = 'Cart was updated by another request. Please try again.';
    } else if (error.message.includes('not found')) {
      errorMessage = 'Item or cart not found';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
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

    // Check menu item availability
    const menuItem = await Menu.findById(cart.items[itemIndex].menu);
    if (!menuItem || !menuItem.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Menu item is no longer available'
      });
    }

    if (quantity > menuItem.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${menuItem.quantity} items available in stock`
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.menu', 'name images discountedPrice mrp');

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
    await cart.populate('items.menu', 'name images discountedPrice mrp');

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
    await cart.populate('items.menu', 'discountedPrice');
    const subtotal = cart.items.reduce((total, item) =>
      total + (item.quantity * item.menu.discountedPrice), 0
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
    await cart.populate('items.menu', 'name images discountedPrice mrp');

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
