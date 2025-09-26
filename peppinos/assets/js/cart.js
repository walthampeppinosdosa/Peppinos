import { cartService } from './services/cart-service.js';
import { showError, showSuccess } from './ui.js';

class CartPage {
  constructor() {
    this.cartContent = document.getElementById('cart-content');
    this.cartSummary = document.getElementById('cart-summary');
    this.cartItemsCount = document.getElementById('cart-items-count');
    this.init();
  }

  async init() {
    try {
      // Show loading state
      this.showLoading();

      // Cart service is already initialized by navigation.js
      // Just wait for it to be ready
      if (!cartService._initialized) {
        await cartService.init();
      }

      // Load cart
      await this.loadCart();

      // Set up event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('Error initializing cart page:', error);
      this.showError('Failed to load cart');
    }
  }

  showLoading() {
    this.cartContent.innerHTML = `
      <div class="cart-loading">
        <div class="cart-loading-spinner"></div>
        <span>Loading your cart...</span>
      </div>
    `;

    if (this.cartSummary) {
      this.cartSummary.innerHTML = `
        <div class="cart-loading">
          <span>Loading summary...</span>
        </div>
      `;
    }
  }

  setupEventListeners() {
    // Prevent duplicate event listeners
    if (this._eventListenerAdded) {
      return;
    }

    // Listen for cart updates
    cartService.addEventListener((cart) => {
      this.renderCart(cart); // Use renderCart directly instead of updateCartDisplay
    });

    this._eventListenerAdded = true;
  }

  async loadCart() {
    try {
      const cart = await cartService.getCart();
      this.renderCart(cart);
    } catch (error) {
      console.error('Error loading cart:', error);
      this.showError('Failed to load cart');
    }
  }

  renderCart(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
      this.renderEmptyCart();
      return;
    }

    const cartItemsHTML = cart.items.map(item => this.renderCartItem(item)).join('');

    // Update cart items content
    this.cartContent.innerHTML = `
      <div class="cart-items-list">
        ${cartItemsHTML}
      </div>
    `;
    // Update cart summary content
    if (this.cartSummary) {
      this.cartSummary.innerHTML = `
        <div class="order-summary-row">
          <span class="cart-summary-label">Subtotal:</span>
          <span class="cart-summary-value">₹${(cart.subtotal || 0).toFixed(2)}</span>
        </div>
        <div class="order-summary-row">
          <span class="cart-summary-label">Tax:</span>
          <span class="cart-summary-value">₹${(cart.tax || 0).toFixed(2)}</span>
        </div>
        <div class="order-summary-row">
          <span class="cart-summary-label">Delivery Fee:</span>
          <span class="cart-summary-value">₹${(cart.deliveryFee || 0).toFixed(2)}</span>
        </div>
        <div class="order-summary-row cart-summary-total">
          <span class="cart-summary-label">Total:</span>
          <span class="cart-summary-value">₹${(cart.total || cart.subtotal || 0).toFixed(2)}</span>
        </div>
   
        <div class="cart-actions" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 1rem;">
          <button class="cart-checkout-btn" onclick="cartPage.proceedToCheckout()" style="width: 100%; max-width: 300px;">
            Proceed to Checkout
          </button>
          <button class="btn btn-outline" onclick="window.location.href='menu.html'" style="width: 100%; max-width: 300px;">
           Browse menu
          </button>
          <button class="btn btn-secondary" onclick="cartPage.clearCart()" style="width: 100%; max-width: 300px;">
            Clear Cart
          </button>
        </div>
      `;
    }

    // Update cart items count
    if (this.cartItemsCount) {
      this.cartItemsCount.textContent = `${cart.items.length} item${cart.items.length !== 1 ? 's' : ''}`;
    }
  }

  renderCartItem(item) {
    const imageUrl = item.menu?.images?.[0]?.url || './assets/images/menu-placeholder.jpg';
    const itemName = item.menu?.name || item.menuName || 'Menu Item';
    const itemPrice = item.priceAtTime || item.price || 0;
    const itemTotal = item.itemTotal || (itemPrice * item.quantity);
    const originalPrice = item.menu?.mrp || itemPrice;
    const hasDiscount = originalPrice > itemPrice;

    // Build options display
    const options = [];
    if (item.size && item.size !== 'Medium') options.push(`Size: ${item.size}`);
    if (item.spicyLevel) options.push(`Spicy: ${item.spicyLevel}`);
    if (item.preparations && item.preparations.length > 0) {
      options.push(`Prep: ${item.preparations.join(', ')}`);
    }
    if (item.addons && item.addons.length > 0) {
      options.push(`Add-ons: ${item.addons.map(addon => addon.name).join(', ')}`);
    }

    return `
      <div class="cart-page-item" data-item-id="${item._id}">
        <div class="cart-page-item-image">
          <img src="${imageUrl}" alt="${itemName}">
        </div>
        <div class="cart-page-item-details">
          <h4 class="cart-page-item-name">${itemName}</h4>
          <p class="cart-page-item-description">${item.menu?.description || ''}</p>
          ${options.length > 0 ? `
            <div class="cart-page-item-options">
              ${options.map(option => `<span class="cart-page-item-option">${option}</span>`).join('')}
            </div>
          ` : ''}
          ${item.specialInstructions ?
            `<div class="cart-page-item-options">
              <span class="cart-page-item-option">Note: ${item.specialInstructions}</span>
            </div>` :
            ''
          }
        </div>
        <div class="cart-page-quantity-controls">
          <button class="cart-page-qty-btn" onclick="cartPage.updateQuantity('${item._id}', ${item.quantity - 1})">
            <ion-icon name="remove-outline"></ion-icon>
          </button>
          <span class="cart-page-qty-display">${item.quantity}</span>
          <button class="cart-page-qty-btn" onclick="cartPage.updateQuantity('${item._id}', ${item.quantity + 1})">
            <ion-icon name="add-outline"></ion-icon>
          </button>
        </div>
        <div class="cart-page-item-price">
          ${hasDiscount ? `<span class="cart-page-item-original-price">₹${originalPrice.toFixed(2)}</span>` : ''}
          ₹${itemTotal.toFixed(2)}
        </div>
        <button class="cart-page-remove-btn" onclick="cartPage.removeItem('${item._id}')" title="Remove item">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>
    `;
  }

  renderEmptyCart() {
    this.cartContent.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">
          <ion-icon name="bag-outline"></ion-icon>
        </div>
        <h2 class="cart-empty-title">Your cart is empty</h2>
        <p class="cart-empty-text">Add some delicious items from our menu to get started!</p>
        <div class="empty-cart-actions" style="margin-top: 1rem;">
          <a href="./menu.html" class="btn btn-primary" style="margin-right: 1rem;">
            Browse Menu
          </a>
          <a href="./index.html" class="btn btn-outline">
            Back to Home
          </a>
        </div>
      </div>
    `;

    // Clear summary section
    if (this.cartSummary) {
      this.cartSummary.innerHTML = '';
    }

    // Update cart items count
    if (this.cartItemsCount) {
      this.cartItemsCount.textContent = '0 items';
    }
  }

  async updateQuantity(itemId, newQuantity) {
    try {
      // Validate quantity
      if (newQuantity < 0) {
        showError('Quantity cannot be negative');
        return;
      }

      if (newQuantity === 0) {
        await this.removeItem(itemId);
        return;
      }

      // Validate maximum quantity (10 items max per item)
      if (newQuantity > 10) {
        showError('Maximum 10 items allowed per menu item');
        return;
      }

      await cartService.updateCartItem(itemId, newQuantity);
      // Cart will be updated via event listener, no need to manually reload
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Error toast is already shown by cart service
    }
  }

  async removeItem(itemId) {
    try {
      await cartService.removeFromCart(itemId);
      // Cart will be updated via event listener, no need to manually reload
    } catch (error) {
      console.error('Error removing item:', error);
      // Error toast is already shown by cart service
    }
  }

  async clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
      try {
        await cartService.clearCart();
        // Don't call loadCart() here - clearCart() already triggers notifyListeners()
        // which will update the display via the event listener
      } catch (error) {
        console.error('Error clearing cart:', error);
        this.showError('Failed to clear cart');
      }
    }
  }

  applyPromoCode() {
    const promoInput = document.getElementById('promoCode');
    const promoCode = promoInput.value.trim().toUpperCase();

    if (!promoCode) {
      showError('Please enter a promo code');
      return;
    }

    // Basic promo code validation (you can expand this)
    const validPromoCodes = {
      'WELCOME10': { discount: 0.10, description: '10% off your order' },
      'SAVE5': { discount: 5, description: '$5 off your order' },
      'FREESHIP': { discount: 0, description: 'Free delivery' }
    };

    if (validPromoCodes[promoCode]) {
      showSuccess(`Promo code applied: ${validPromoCodes[promoCode].description}`);
      promoInput.value = '';
      // Here you would typically send the promo code to the backend
      // For now, just show success message
    } else {
      showError('Invalid promo code');
    }
  }

  saveForLater(itemId) {
    try {
      // Get the item details from current cart state
      const cart = cartService.cart; // Use cached cart instead of calling getCart()
      const item = cart?.items?.find(i => i._id === itemId);

      if (item) {
        // Save to localStorage for now (in production, you'd save to backend)
        const savedItems = JSON.parse(localStorage.getItem('savedForLater') || '[]');
        savedItems.push({
          ...item,
          savedAt: new Date().toISOString()
        });
        localStorage.setItem('savedForLater', JSON.stringify(savedItems));

        // Remove from cart
        this.removeItem(itemId);
        showSuccess('Item saved for later');
      }
    } catch (error) {
      console.error('Error saving item for later:', error);
      showError('Failed to save item for later');
    }
  }

  async proceedToCheckout() {
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

  updateCartDisplay() {
    // Get current cart data without triggering another API call
    const cart = cartService.cart;
    if (cart) {
      this.renderCart(cart);
    }
  }

  updateCartCount(count) {
    if (this.cartCount) {
      this.cartCount.textContent = count || 0;
    }
  }

  showError(message) {
    this.cartContent.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">
          <ion-icon name="alert-circle-outline" style="color: var(--red-orange-crayola);"></ion-icon>
        </div>
        <h2 class="cart-empty-title">Error</h2>
        <p class="cart-empty-text">${message}</p>
        <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">
          Try Again
        </button>
      </div>
    `;

    // Clear summary section
    if (this.cartSummary) {
      this.cartSummary.innerHTML = '';
    }
  }
}

// Initialize cart page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.cartPage = new CartPage();
});

// Export for use in other modules
export { CartPage };
