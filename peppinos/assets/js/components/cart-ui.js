/**
 * Cart UI Component
 * Handles cart sidebar/modal display and interactions
 */

import { cartService } from '../services/cart-service.js';
import { formatCurrency } from '../ui.js';

class CartUI {
  constructor() {
    // Prevent duplicate instances
    if (window.cartUIInstance) {
      console.log('🔄 CartUI instance already exists, returning existing instance');
      return window.cartUIInstance;
    }

    this.isOpen = false;
    this.cartOverlay = null;
    this.cartSidebar = null;
    this.cartIcon = null;
    this.cartCount = null;
    this.init();

    // Store instance globally to prevent duplicates
    window.cartUIInstance = this;
  }

  /**
   * Initialize cart UI
   */
  init() {
    this.createCartHTML();
    this.setupEventListeners();
    this.updateCartIcon();
    this.setupMobileEnhancements();

    // Listen for cart updates
    cartService.addEventListener((cart) => {
      // Prevent updates during DOM manipulation
      if (this._isUpdating) {
        return;
      }

      this._isUpdating = true;
      try {
        // Ensure cart HTML exists before updating
        if (!document.getElementById('cart-overlay')) {
          this.createCartHTML();
        }
        this.updateCartDisplay(cart);
        this.updateCartIcon();
      } finally {
        this._isUpdating = false;
      }
    });
  }

  /**
   * Create cart HTML structure
   */
  createCartHTML() {
    // Create cart icon in header if it doesn't exist
    this.createCartIcon();

    // Check if cart overlay already exists
    if (document.getElementById('cart-overlay')) {
      console.log('🔄 Cart overlay already exists, using existing one');
      this.cartOverlay = document.getElementById('cart-overlay');
      this.cartSidebar = this.cartOverlay.querySelector('.cart-sidebar');
      return;
    }

    // Create cart sidebar overlay
    const cartHTML = `
      <div id="cart-overlay" class="cart-overlay">
        <div class="cart-sidebar">
          <div class="cart-header">
            <h3 class="cart-title">Your Cart</h3>
            <button class="cart-close-btn" aria-label="Close cart">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
          
          <div class="cart-content">
            <div id="cart-items" class="cart-items">
              <!-- Cart items will be populated here -->
            </div>
            
            <div class="cart-summary">
              <div class="cart-summary-row">
                <span>Subtotal</span>
                <span id="cart-subtotal">$0.00</span>
              </div>
              <div class="cart-summary-row">
                <span>Tax</span>
                <span id="cart-tax">$0.00</span>
              </div>
              <div class="cart-summary-row cart-total">
                <span>Total</span>
                <span id="cart-total">$0.00</span>
              </div>
            </div>
            
            <div class="cart-actions">
              <button id="view-cart-btn" class="btn btn-outline">View Cart</button>
              <button id="checkout-btn" class="btn btn-outline">Checkout</button>
            </div>
          </div>
          
          <div class="cart-empty" style="display: none;">
            <div class="cart-empty-content">
              <ion-icon name="bag-outline" class="cart-empty-icon"></ion-icon>
              <h4>Your cart is empty</h4>
              <p>Add some delicious items to get started!</p>
              <button class="btn btn-primary" onclick="cartUI.closeCart()">Browse menu</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add to body
    document.body.insertAdjacentHTML('beforeend', cartHTML);
    
    // Get references
    this.cartOverlay = document.getElementById('cart-overlay');
    this.cartSidebar = this.cartOverlay.querySelector('.cart-sidebar');
  }

  /**
   * Create cart icon in header
   */
  createCartIcon() {
    // Try to find existing cart icon first
    this.cartIcon = document.getElementById('cartIcon') || document.getElementById('cart-icon-btn');
    this.cartCount = document.getElementById('cartCount') || document.getElementById('cart-count');



    // If no existing cart icon found, create one
    if (!this.cartIcon) {
      const headerNav = document.querySelector('.navbar-nav') || document.querySelector('.header .navbar');

      if (headerNav) {
        const cartIconHTML = `
          <li class="navbar-item">
            <button class="navbar-link cart-icon-btn" id="cart-icon-btn" aria-label="Open cart">
              <ion-icon name="bag-outline" class="cart-icon"></ion-icon>
              <span class="cart-count" id="cart-count">0</span>
            </button>
          </li>
        `;

        headerNav.insertAdjacentHTML('beforeend', cartIconHTML);

        this.cartIcon = document.getElementById('cart-icon-btn');
        this.cartCount = document.getElementById('cart-count');
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Cart icon click - use event delegation to handle dynamically moved elements
    // Use capture phase to handle before other listeners
    document.addEventListener('click', (e) => {
      if (e.target.closest('.cart-icon-btn, #cartIcon')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent other event listeners from firing
        console.log('🛒 Cart icon clicked, opening cart...');
        this.openCart();
      }
    }, { capture: true });

    // Use event delegation for close button since it's created dynamically
    // Use multiple event handlers to ensure it works on mobile
    document.addEventListener('click', (e) => {
      if (e.target.closest('.cart-close-btn')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🛒 Cart close button clicked (capture phase)');
        this.closeCart();
      }
    }, { capture: true }); // Capture phase for priority

    // Backup bubble phase handler
    document.addEventListener('click', (e) => {
      if (e.target.closest('.cart-close-btn')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🛒 Cart close button clicked (bubble phase)');
        this.closeCart();
      }
    }, { capture: false });

    // Add touch events for mobile
    document.addEventListener('touchend', (e) => {
      if (e.target.closest('.cart-close-btn')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🛒 Cart close button touched');
        this.closeCart();
      }
    }, { capture: true });

    // Use event delegation for overlay click to close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('cart-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🛒 Cart overlay clicked, closing cart');
        this.closeCart();
      }
    });

    // Add touch event for overlay on mobile
    document.addEventListener('touchend', (e) => {
      if (e.target.classList.contains('cart-overlay')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🛒 Cart overlay touched, closing cart');
        this.closeCart();
      }
    });

    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCheckout();
      });

      // Add touch event for mobile
      checkoutBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCheckout();
      });
    }

    // View cart button
    const viewCartBtn = document.getElementById('view-cart-btn');
    if (viewCartBtn) {
      viewCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCart();
      });

      // Add touch event for mobile
      viewCartBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCart();
      });
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeCart();
      }
    });
  }

  /**
   * Open cart sidebar
   */
  openCart() {
    if (!this.cartOverlay) {
      // Try to create cart HTML if it doesn't exist
      this.createCartHTML();
      if (!this.cartOverlay) {
        console.error('🛒 CartUI: Failed to create cart overlay');
        return;
      }
    }

    this.isOpen = true;
    this.cartOverlay.classList.add('active');
    document.body.classList.add('cart-open');

    // Update cart display with current cart data
    const currentCart = cartService.cart;
    if (currentCart) {
      this.updateCartDisplay(currentCart);
    }
  }

  /**
   * Close cart sidebar
   */
  closeCart() {
    this.isOpen = false;
    this.cartOverlay.classList.remove('active');
    document.body.classList.remove('cart-open');
  }

  /**
   * Update cart icon with item count
   */
  updateCartIcon() {
    if (this.cartCount) {
      const cart = cartService.cart;
      // Use consistent count calculation: total quantity (sum of all item quantities)
      const count = cart ? (cart.totalItems || cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0) : 0;
      this.cartCount.textContent = count;
      this.cartCount.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Update cart display
   */
  updateCartDisplay(cart) {
    const cartItems = document.getElementById('cart-items');
    const cartEmpty = document.querySelector('.cart-empty');
    const cartContent = document.querySelector('.cart-content');

    if (!cartItems) {
      // Cart sidebar not created yet, try to create it
      this.createCartHTML();
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      // Show empty cart
      if (cartContent) cartContent.style.display = 'none';
      if (cartEmpty) cartEmpty.style.display = 'block';
      return;
    }

    // Show cart content
    if (cartContent) cartContent.style.display = 'block';
    if (cartEmpty) cartEmpty.style.display = 'none';

    // Render cart items
    cartItems.innerHTML = cart.items.map(item => this.renderCartItem(item)).join('');

    // Update totals
    this.updateCartTotals(cart);

    // Setup item event listeners
    this.setupItemEventListeners();

    // Re-setup cart action buttons (for mobile compatibility)
    this.setupCartActionButtons();
  }

  /**
   * Render single cart item
   */
  renderCartItem(item) {
    const menu = item.menu || {};
    const imageUrl = menu.images && menu.images.length > 0 
      ? menu.images[0].url 
      : './assets/images/menu-1.png';

    return `
      <div class="cart-item" data-item-id="${item._id}">
        <div class="cart-item-image">
          <img src="${imageUrl}" alt="${menu.name || 'Menu Item'}" loading="lazy">
        </div>
        
        <div class="cart-item-details">
          <h4 class="cart-item-name">${menu.name || 'Menu Item'}</h4>
          <p class="cart-item-size">Size: ${item.size || 'Medium'}</p>
          ${item.addons && item.addons.length > 0 ? `
            <p class="cart-item-addons">
              Add-ons: ${item.addons.map(addon => addon.name).join(', ')}
            </p>
          ` : ''}
          ${item.specialInstructions ? `
            <p class="cart-item-instructions">${item.specialInstructions}</p>
          ` : ''}
        </div>
        
        <div class="cart-item-controls">
          <div class="quantity-controls">
            <button class="qty-btn qty-decrease" data-item-id="${item._id}">-</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn qty-increase" data-item-id="${item._id}">+</button>
          </div>
          
          <div class="cart-item-price">
            ${formatCurrency(item.itemTotal || 0)}
          </div>
          
          <button class="cart-item-remove" data-item-id="${item._id}" aria-label="Remove item">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Update cart totals
   */
  updateCartTotals(cart) {
    const subtotal = cart.subtotal || 0;
    const tax = cartService.calculateTax(subtotal);
    const total = subtotal + tax;

    // Safely update elements if they exist
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = formatCurrency(tax);
    if (totalEl) totalEl.textContent = formatCurrency(total);
  }

  /**
   * Setup event listeners for cart items
   */
  setupItemEventListeners() {
    // Quantity controls
    document.querySelectorAll('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.itemId;
        this.decreaseQuantity(itemId);
      });
    });

    document.querySelectorAll('.qty-increase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.itemId;
        this.increaseQuantity(itemId);
      });
    });

    // Remove buttons
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.closest('[data-item-id]').dataset.itemId;
        this.removeItem(itemId);
      });
    });
  }

  /**
   * Increase item quantity
   */
  async increaseQuantity(itemId) {
    try {
      const item = cartService.cart.items.find(item => item._id === itemId);
      if (item) {
        await cartService.updateCartItem(itemId, item.quantity + 1);
      }
    } catch (error) {
      console.error('Error increasing quantity:', error);
      // Show error message
    }
  }

  /**
   * Decrease item quantity
   */
  async decreaseQuantity(itemId) {
    try {
      const item = cartService.cart.items.find(item => item._id === itemId);
      if (item && item.quantity > 1) {
        await cartService.updateCartItem(itemId, item.quantity - 1);
      } else if (item && item.quantity === 1) {
        // Remove item if quantity would be 0
        await this.removeItem(itemId);
      }
    } catch (error) {
      console.error('Error decreasing quantity:', error);
      // Show error message
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId) {
    try {
      await cartService.removeFromCart(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
      // Show error message
    }
  }

  /**
   * Go to checkout
   */
  async goToCheckout() {
    try {
      const result = await cartService.handleCheckout();

      if (result.authenticated) {
        // Authenticated user - go to authenticated checkout page
        window.location.href = './checkout.html';
      } else if (result.continueAsGuest) {
        // Guest user - go to guest checkout page
        window.location.href = './guest-checkout.html';
      } else if (result.redirected) {
        // User will be redirected to login/signup
        // Cart will be preserved and transferred after login
        console.log('Redirecting to authentication...');
      }
    } catch (error) {
      console.log('Checkout cancelled:', error.message);
      // User cancelled, do nothing
    }
  }

  /**
   * Go to cart page
   */
  goToCart() {
    // Close the cart sidebar
    this.closeCart();

    // Navigate to cart page
    window.location.href = './cart.html';
  }

  /**
   * Setup cart action buttons (View Cart and Checkout)
   * This method ensures buttons work on mobile devices
   */
  setupCartActionButtons() {
    // Remove existing listeners to prevent duplicates
    const checkoutBtn = document.getElementById('checkout-btn');
    const viewCartBtn = document.getElementById('view-cart-btn');

    if (checkoutBtn) {
      // Clone button to remove all event listeners
      const newCheckoutBtn = checkoutBtn.cloneNode(true);
      checkoutBtn.parentNode.replaceChild(newCheckoutBtn, checkoutBtn);

      // Add fresh event listeners
      newCheckoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCheckout();
      });

      // Add touch event for mobile
      newCheckoutBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCheckout();
      });
    }

    if (viewCartBtn) {
      // Clone button to remove all event listeners
      const newViewCartBtn = viewCartBtn.cloneNode(true);
      viewCartBtn.parentNode.replaceChild(newViewCartBtn, viewCartBtn);

      // Add fresh event listeners
      newViewCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCart();
      });

      // Add touch event for mobile
      newViewCartBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goToCart();
      });
    }
  }

  /**
   * Setup mobile-specific enhancements
   */
  setupMobileEnhancements() {
    // Add touch-friendly interactions
    if ('ontouchstart' in window) {
      // Add touch feedback for buttons
      document.addEventListener('touchstart', (e) => {
        if (e.target.closest('.qty-btn, .cart-item-remove, .cart-icon-btn')) {
          e.target.style.transform = 'scale(0.95)';
        }
      });

      document.addEventListener('touchend', (e) => {
        if (e.target.closest('.qty-btn, .cart-item-remove, .cart-icon-btn')) {
          setTimeout(() => {
            e.target.style.transform = '';
          }, 100);
        }
      });

      // Prevent double-tap zoom on cart buttons
      document.addEventListener('touchend', (e) => {
        if (e.target.closest('.cart-sidebar')) {
          e.preventDefault();
        }
      });
    }

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (this.isOpen) {
          this.adjustForOrientation();
        }
      }, 100);
    });

    // Handle viewport height changes (mobile keyboard)
    let initialViewportHeight = window.innerHeight;
    window.addEventListener('resize', () => {
      if (this.isOpen && window.innerHeight < initialViewportHeight * 0.75) {
        // Keyboard is likely open, adjust cart height
        this.cartSidebar.style.height = `${window.innerHeight}px`;
      } else {
        this.cartSidebar.style.height = '100%';
      }
    });
  }

  /**
   * Adjust cart for orientation changes
   */
  adjustForOrientation() {
    // Force reflow to handle orientation change
    this.cartSidebar.style.display = 'none';
    this.cartSidebar.offsetHeight; // Trigger reflow
    this.cartSidebar.style.display = 'flex';
  }
}

// Create and export singleton instance
export const cartUI = new CartUI();

// Export the class as well for flexibility
export { CartUI };

// Make it globally accessible
window.cartUI = cartUI;

export default cartUI;
