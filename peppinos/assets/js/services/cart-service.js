/**
 * Cart Service
 * Handles cart operations for both guest and authenticated users
 */

import { httpClient } from '../api.js';
import CONFIG from '../config.js';
import { sessionManager } from './session-manager.js';
import {
  isAuthenticated as isUserLoggedIn,
  getCurrentUser,
  addEventListener as addAuthListener,
  showLoginPrompt
} from '../auth.js';
import { showSuccess, showError } from '../ui.js';

class CartService {
  constructor() {
    this.cart = null;
    this.sessionId = this.getOrCreateSessionId();
    this.isAuthenticated = false;
    this.listeners = [];
    this._initialized = false;
    this._isUpdating = false; // Flag to prevent recursive updates
    this._initPromise = null; // Prevent multiple simultaneous inits
    this._cartLoadPromise = null; // Prevent multiple simultaneous cart loads
    this.setupSessionListeners();
    this.setupAuthListeners();
  }

  /**
   * Initialize cart service (must be called after construction)
   */
  async init() {
    if (this._initialized) return;

    // Prevent multiple simultaneous initializations
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    // Check current authentication status - use proper auth check
    this.isAuthenticated = this.checkUserAuthentication();

    // Set session ID based on authentication status
    if (this.isAuthenticated) {
      const user = getCurrentUser();
      this.sessionId = user?._id || user?.id;
    } else {
      this.sessionId = this.getOrCreateSessionId();
    }

    console.log('🛒 Cart Service Init:', {
      isAuthenticated: this.isAuthenticated,
      sessionId: this.sessionId,
      user: getCurrentUser()
    });

    // Load cart based on current auth state
    await this.getCart();
    this._initialized = true;
    this._initPromise = null; // Reset promise
  }

  /**
   * Check if user is actually authenticated (not guest)
   */
  checkUserAuthentication() {
    const user = getCurrentUser();
    const isLoggedIn = isUserLoggedIn();
    const isGuest = localStorage.getItem('peppinos_is_guest') === 'true';

    // User is authenticated if they have a valid token AND are not a guest AND has user data
    // Check both user.id and user._id for compatibility
    const userId = user?.id || user?._id;
    const isRealUser = isLoggedIn && !isGuest && user && userId;

    console.log('🔐 Authentication Check:', {
      isLoggedIn,
      isGuest,
      hasUser: !!user,
      userId,
      isRealUser
    });

    return isRealUser;
  }

  /**
   * Setup session listeners for cross-tab synchronization
   */
  setupSessionListeners() {
    sessionManager.addEventListener((event, data) => {
      if (event === 'cartUpdated' && data) {
        // Cart was updated in another tab
        this.cart = data.cart;
        this.notifyListeners();
      } else if (event === 'userLoggedOut') {
        // User logged out in another tab - recheck authentication
        this.isAuthenticated = this.checkUserAuthentication();
        this.sessionId = this.getOrCreateSessionId();
        console.log('🔐 Session Event - User logged out in another tab:', { isAuthenticated: this.isAuthenticated });
        // Add small delay to prevent rate limiting
        setTimeout(() => this.getCart(), 500); // Refresh cart
      }
    });
  }

  /**
   * Setup auth listeners for authentication changes
   */
  setupAuthListeners() {
    addAuthListener((event, data) => {
      if (event === 'authenticated') {
        // User logged in - recheck authentication status
        this.isAuthenticated = this.checkUserAuthentication();
        if (this.isAuthenticated) {
          // Use user ID as session ID for authenticated users
          const user = getCurrentUser();
          this.sessionId = user?._id || user?.id || data?.id;
        }
        console.log('🔐 Auth Event - User logged in:', { isAuthenticated: this.isAuthenticated, sessionId: this.sessionId });
        // Add small delay to prevent rate limiting
        setTimeout(() => this.getCart(), 500); // Refresh cart with user data
      } else if (event === 'unauthenticated') {
        // User logged out
        this.isAuthenticated = false;
        this.sessionId = this.getOrCreateSessionId();
        console.log('🔐 Auth Event - User logged out:', { sessionId: this.sessionId });
        // Add small delay to prevent rate limiting
        setTimeout(() => this.getCart(), 500); // Refresh cart as guest
      } else if (event === 'cartTransferred') {
        // Cart was transferred from temp to user
        this.cart = data;
        this.notifyListeners();
      }
    });
  }

  /**
   * Get or create guest session ID
   */
  getOrCreateSessionId() {
    const session = sessionManager.getOrCreateGuestSession();
    return session.id;
  }

  /**
   * Add event listener for cart updates
   */
  addEventListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of cart updates
   */
  notifyListeners() {
    if (this._isUpdating) {
      return; // Prevent recursive updates
    }

    this._isUpdating = true;
    try {
      this.listeners.forEach(callback => callback(this.cart));
      this.saveToLocalStorage();
    } finally {
      this._isUpdating = false;
    }
  }

  /**
   * Save cart to localStorage for persistence
   */
  saveToLocalStorage() {
    try {
      const cartData = {
        cart: this.cart,
        sessionId: this.sessionId,
        timestamp: Date.now()
      };
      localStorage.setItem('peppinos_cart', JSON.stringify(cartData));
    } catch (error) {
      console.warn('Failed to save cart to localStorage:', error);
    }
  }

  /**
   * Load cart from localStorage
   */
  loadFromLocalStorage() {
    try {
      const cartData = localStorage.getItem('peppinos_cart');
      if (!cartData) return null;

      const parsed = JSON.parse(cartData);

      // Check if cart data is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem('peppinos_cart');
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('Failed to load cart from localStorage:', error);
      localStorage.removeItem('peppinos_cart');
      return null;
    }
  }

  /**
   * Clear cart from localStorage
   */
  clearLocalStorage() {
    try {
      localStorage.removeItem('peppinos_cart');
    } catch (error) {
      console.warn('Failed to clear cart from localStorage:', error);
    }
  }

  /**
   * Get current cart
   */
  async getCart() {
    // Prevent multiple simultaneous cart loads
    if (this._cartLoadPromise) {
      return this._cartLoadPromise;
    }

    this._cartLoadPromise = this._doGetCart();
    const result = await this._cartLoadPromise;
    this._cartLoadPromise = null; // Reset promise
    return result;
  }

  async _doGetCart() {
    try {
      let response;

      if (this.isAuthenticated) {
        response = await httpClient.get('/api/shop/cart');
      } else {
        response = await httpClient.get(`/api/shop/guest/cart/${this.sessionId}`);
      }

      if (response.success) {
        // Handle different response structures
        this.cart = response.data.cart || response.data;

        // Ensure cart has proper calculated fields
        this.calculateCartTotals();

        this.notifyListeners();
        return this.cart;
      } else {
        throw new Error(response.message || 'Failed to get cart');
      }
    } catch (error) {
      console.error('Error getting cart:', error);
      // Return empty cart on error
      this.cart = {
        items: [],
        subtotal: 0,
        totalItems: 0,
        tax: 0,
        total: 0
      };
      this.notifyListeners();
      return this.cart;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(menuItemId, quantity = 1, size = 'Medium', addons = [], specialInstructions = '') {
    try {
      const cartData = {
        menuItemId,
        quantity,
        size,
        addons,
        specialInstructions
      };

      let response;
      
      if (this.isAuthenticated) {
        response = await httpClient.post('/api/shop/cart/items', cartData);
      } else {
        response = await httpClient.post(`/api/shop/guest/cart/${this.sessionId}`, cartData);
      }

      if (response.success) {
        await this.getCart(); // Refresh cart

        // Show success toast
        const quantityText = quantity === 1 ? '1 item' : `${quantity} items`;
        showSuccess(`${quantityText} added to cart successfully!`);

        return response;
      } else {
        throw new Error(response.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showError(error.message || 'Failed to add item to cart. Please try again.');
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(itemId, quantity) {
    try {
      let response;
      
      if (this.isAuthenticated) {
        response = await httpClient.put(`/api/shop/cart/items/${itemId}`, { quantity });
      } else {
        response = await httpClient.put(`/api/shop/guest/cart/${this.sessionId}/items/${itemId}`, { quantity });
      }

      if (response.success) {
        await this.getCart(); // Refresh cart

        // Show success toast
        showSuccess('Cart updated successfully!');

        return response;
      } else {
        throw new Error(response.message || 'Failed to update cart item');
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      showError(error.message || 'Failed to update cart item');
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemId) {
    try {
      let response;
      
      if (this.isAuthenticated) {
        response = await httpClient.delete(`/api/shop/cart/items/${itemId}`);
      } else {
        response = await httpClient.delete(`/api/shop/guest/cart/${this.sessionId}/items/${itemId}`);
      }

      if (response.success) {
        await this.getCart(); // Refresh cart
        return response;
      } else {
        throw new Error(response.message || 'Failed to remove item from cart');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      showError(error.message || 'Failed to remove item from cart');
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart() {
    try {
      let response;
      
      if (this.isAuthenticated) {
        response = await httpClient.delete('/api/shop/cart');
      } else {
        response = await httpClient.delete(`/api/shop/guest/cart/${this.sessionId}`);
      }

      if (response.success) {
        this.clearLocalStorage(); // Clear localStorage
        await this.getCart(); // Refresh cart
        return response;
      } else {
        throw new Error(response.message || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      showError(error.message || 'Failed to clear cart');
      throw error;
    }
  }

  /**
   * Calculate cart totals
   */
  calculateCartTotals() {
    if (!this.cart || !this.cart.items) {
      return;
    }

    // Calculate subtotal from items
    const subtotal = this.cart.items.reduce((sum, item) => {
      return sum + (item.itemTotal || (item.priceAtTime || item.price || 0) * item.quantity);
    }, 0);

    // Calculate tax (8% for example)
    const taxRate = 0.08;
    const tax = subtotal * taxRate;

    // Calculate delivery fee (fixed $5 for orders under $50, free for orders over $50)
    const deliveryFee = subtotal < 50 ? 5 : 0;

    // Calculate total
    const total = subtotal + tax + deliveryFee;

    // Update cart object
    this.cart.subtotal = subtotal;
    this.cart.tax = tax;
    this.cart.deliveryFee = deliveryFee;
    this.cart.total = total;
    this.cart.totalItems = this.cart.items.length; // Unique items count
    this.cart.totalQuantity = this.cart.items.reduce((sum, item) => sum + item.quantity, 0); // Total quantity
  }

  /**
   * Get cart item count (unique items, not total quantity)
   */
  getItemCount() {
    return this.cart && this.cart.items ? this.cart.items.length : 0;
  }

  /**
   * Get total quantity of all items
   */
  getTotalQuantity() {
    if (!this.cart || !this.cart.items) return 0;
    return this.cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get cart subtotal
   */
  getSubtotal() {
    return this.cart ? this.cart.subtotal || 0 : 0;
  }

  /**
   * Calculate tax (7% for MA)
   */
  calculateTax(subtotal) {
    return subtotal * 0.07;
  }

  /**
   * Get cart total with tax
   */
  getTotal() {
    const subtotal = this.getSubtotal();
    const tax = this.calculateTax(subtotal);
    return subtotal + tax;
  }

  /**
   * Set authentication status
   */
  setAuthenticated(isAuth) {
    this.isAuthenticated = isAuth;
  }

  /**
   * Handle checkout with authentication check
   */
  async handleCheckout() {
    // Check if cart has items
    if (!this.cart || !this.cart.items || this.cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // If user is not authenticated, show login prompt
    if (!this.isAuthenticated) {
      try {
        const result = await showLoginPrompt(
          'Please sign in to complete your order. Your cart items will be saved!'
        );

        if (result.action === 'guest') {
          // Continue as guest
          return { continueAsGuest: true };
        } else {
          // User chose to sign in/up, they will be redirected
          return { redirected: true };
        }
      } catch (error) {
        // User cancelled login
        throw new Error('Checkout cancelled');
      }
    }

    // User is authenticated, proceed to checkout
    return { authenticated: true };
  }


}

// Create and export singleton instance
export const cartService = new CartService();

// Debug function - remove in production
window.debugCart = () => {
  console.log('Cart Service Debug Info:');
  console.log('- Session ID:', cartService.sessionId);
  console.log('- Is Authenticated:', cartService.isAuthenticated);
  console.log('- Cart:', cartService.cart);
  console.log('- Item Count:', cartService.getItemCount());
  console.log('- Auth Check Result:', cartService.checkUserAuthentication());
  console.log('- Current User:', getCurrentUser());
  console.log('- Is Guest:', localStorage.getItem('peppinos_is_guest'));
};

// Make it globally accessible
window.cartService = cartService;

export default cartService;
