const { validationResult } = require('express-validator');
const Cart = require('../../models/Cart');
const Menu = require('../../models/Menu');
const { getOrCreateGuestUser } = require('../../services/guest-service');

/**
 * Get guest cart
 * GET /api/shop/guest/cart/:sessionId
 */
const getGuestCart = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get or create guest user
    const guestUser = await getOrCreateGuestUser(sessionId);

    // Get or create cart for guest user
    let cart = await Cart.getOrCreateCart(guestUser._id);

    // Populate menu items
    await cart.populate('items.menu', 'name images discountedPrice mrp quantity isActive');

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
    if (cart.appliedCoupon && cart.appliedCoupon.discountAmount) {
      discount = cart.appliedCoupon.discountAmount;
    }

    const total = Math.max(0, cartTotals.subtotal - discount);

    res.status(200).json({
      success: true,
      message: 'Guest cart retrieved successfully',
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
    console.error('Get guest cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guest cart',
      error: error.message
    });
  }
};

/**
 * Add item to guest cart
 * POST /api/shop/guest/cart/:sessionId
 */
const addToGuestCart = async (req, res) => {
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

    const { sessionId } = req.params;
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
      sizeInfo = menuItem.sizes.find(s => s.name === size);

      // If requested size not found, try to find a default size or use first available
      if (!sizeInfo) {
        sizeInfo = menuItem.sizes.find(s => s.isDefault) || menuItem.sizes[0];
        actualSize = sizeInfo.name;
        console.log(`Size "${size}" not found for menu item ${menuItem.name}, using "${sizeInfo.name}" instead`);
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

    // Validate addons
    const validAddons = addons.filter(addon =>
      menuItem.addons.some(menuItemAddon =>
        menuItemAddon._id.toString() === addon.id && addon.quantity > 0
      )
    );

    // Get or create guest user
    const guestUser = await getOrCreateGuestUser(sessionId);

    // Get or create cart
    let cart = await Cart.getOrCreateCart(guestUser._id);

    // Calculate price
    const priceAtTime = basePrice;
    const addonTotal = validAddons.reduce((total, addon) => {
      const menuAddon = menuItem.addons.find(ma => ma._id.toString() === addon.id);
      return total + (menuAddon ? menuAddon.price * addon.quantity : 0);
    }, 0);
    const itemTotal = (priceAtTime + addonTotal) * quantity;

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
      // Update existing item
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].itemTotal =
        (priceAtTime + addonTotal) * cart.items[existingItemIndex].quantity;
      cart.items[existingItemIndex].specialInstructions = specialInstructions;
    } else {
      // Add new item to cart
      cart.items.push({
        menu: menuItemId,
        quantity,
        size: actualSize,
        addons: validAddons.map(addon => {
          const menuAddon = menuItem.addons.find(ma => ma._id.toString() === addon.id);
          return {
            name: menuAddon.name,
            price: menuAddon.price * addon.quantity
          };
        }),
        specialInstructions,
        priceAtTime,
        itemTotal
      });
    }

    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.menu', 'name images discountedPrice mrp');

    res.status(200).json({
      success: true,
      message: 'Item added to guest cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Add to guest cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to guest cart',
      error: error.message
    });
  }
};

/**
 * Update guest cart item
 * PUT /api/shop/guest/cart/:sessionId/items/:itemId
 */
const updateGuestCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { sessionId, itemId } = req.params;
    const { quantity } = req.body;

    // Get or create guest user
    const guestUser = await getOrCreateGuestUser(sessionId);

    // Get cart for guest user
    const cart = await Cart.findOne({ user: guestUser._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Guest cart not found'
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

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity and recalculate total
      cart.items[itemIndex].quantity = quantity;
      const addonTotal = cart.items[itemIndex].addons.reduce((total, addon) => total + addon.price, 0);
      cart.items[itemIndex].itemTotal = (cart.items[itemIndex].priceAtTime + addonTotal) * quantity;
    }

    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.menu', 'name images discountedPrice mrp');

    res.status(200).json({
      success: true,
      message: 'Guest cart item updated successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Update guest cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update guest cart item',
      error: error.message
    });
  }
};

/**
 * Remove item from guest cart
 * DELETE /api/shop/guest/cart/:sessionId/items/:itemId
 */
const removeFromGuestCart = async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;

    // Get or create guest user
    const guestUser = await getOrCreateGuestUser(sessionId);

    // Get cart for guest user
    const cart = await Cart.findOne({ user: guestUser._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Guest cart not found'
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
      message: 'Item removed from guest cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Remove from guest cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from guest cart',
      error: error.message
    });
  }
};

/**
 * Clear guest cart
 * DELETE /api/shop/guest/cart/:sessionId
 */
const clearGuestCart = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get or create guest user
    const guestUser = await getOrCreateGuestUser(sessionId);

    // Get cart for guest user
    const cart = await Cart.findOne({ user: guestUser._id, isActive: true });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Guest cart not found'
      });
    }

    cart.items = [];
    cart.appliedCoupon = undefined;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Guest cart cleared successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Clear guest cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear guest cart',
      error: error.message
    });
  }
};

module.exports = {
  getGuestCart,
  addToGuestCart,
  updateGuestCartItem,
  removeFromGuestCart,
  clearGuestCart
};
