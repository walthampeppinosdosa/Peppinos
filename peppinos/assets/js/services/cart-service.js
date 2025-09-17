/**
 * Cart Service
 * Handles cart operations for both guest and authenticated users
 */

import { httpClient } from '../api.js';
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
    this._refreshTimeout = null; // Debounce cart refreshes
    this._pendingRequests = new Map(); // Track pending requests to prevent duplicates
    this._lastCartUpdate = null; // Track when cart was last updated
    this.setupSessionListeners();
    this.setupAuthListeners();
  }

  /**
   * Initialize cart service (must be called after construction)
   */
  async init() {
    if (this._initialized) {
      console.log('🔄 Cart service already initialized, skipping...');
      return;
    }

    // Prevent multiple simultaneous initializations
    if (this._initPromise) {
      console.log('🔄 Cart service init already in progress, waiting...');
      return this._initPromise;
    }

    console.log('🚀 Starting cart service initialization...');
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    // Skip initialization if Kinde callback is in progress
    if (window.kindeCallbackInProgress) {
      console.log('🔄 Skipping cart init - Kinde callback in progress');
      this._initPromise = null;
      return;
    }

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



    return isRealUser;
  }

  /**
   * Setup session listeners for cross-tab synchronization
   */
  setupSessionListeners() {
    sessionManager.addEventListener((event, data) => {
      if (event === 'cartUpdated' && data) {
        // Cart was updated in another tab - prevent infinite loop
        if (this._isUpdatingFromStorage) {
          return;
        }
        this._isUpdatingFromStorage = true;
        this.cart = data.cart;
        // Don't call notifyListeners here to prevent storage loop
        // Just update the UI directly
        this.listeners.forEach(callback => {
          try {
            callback(this.cart);
          } catch (error) {
            console.error('Error in cart listener:', error);
          }
        });
        this._isUpdatingFromStorage = false;
      } else if (event === 'userLoggedOut') {
        // User logged out in another tab - recheck authentication
        this.isAuthenticated = this.checkUserAuthentication();
        this.sessionId = this.getOrCreateSessionId();
        console.log('🔐 Session Event - User logged out in another tab:', { isAuthenticated: this.isAuthenticated });
        // Use debounced refresh to prevent excessive requests, but only if not recently updated
        if (!this._lastCartUpdate || (Date.now() - this._lastCartUpdate) > 3000) {
          this.debouncedRefreshCart();
        } else {
          console.log('🔄 Skipping session cart refresh - recently updated');
        }
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

        // Skip cart refresh if we're in Kinde callback flow (will redirect soon)
        if (window.kindeCallbackInProgress) {
          console.log('🔄 Skipping cart refresh - Kinde callback in progress, will redirect');
          return;
        }

        // Only refresh cart if we're fully initialized and not currently updating
        // Also check if we recently updated to prevent excessive calls
        if (this._initialized && !this._initPromise && !this._isUpdating &&
            (!this._lastCartUpdate || (Date.now() - this._lastCartUpdate) > 3000)) {
          this.debouncedRefreshCart();
        } else {
          console.log('🔄 Skipping cart refresh - cart service not ready or recently updated');
        }
      } else if (event === 'unauthenticated') {
        // User logged out
        this.isAuthenticated = false;
        this.sessionId = this.getOrCreateSessionId();
        console.log('🔐 Auth Event - User logged out:', { sessionId: this.sessionId });

        // Only refresh cart if we're fully initialized and not currently updating
        // Also check if we recently updated to prevent excessive calls
        if (this._initialized && !this._initPromise && !this._isUpdating &&
            (!this._lastCartUpdate || (Date.now() - this._lastCartUpdate) > 3000)) {
          this.debouncedRefreshCart();
        } else {
          console.log('🔄 Skipping cart refresh - cart service not ready or recently updated');
        }
      } else if (event === 'cartTransferred') {
        // Cart was transferred from temp to user
        this.cart = data;
        this.notifyListeners();
      }
    });
  }

  /**
   * Debounced cart refresh to prevent excessive API calls
   */
  debouncedRefreshCart() {
    // Don't refresh if we're currently initializing or updating
    if (this._initPromise || this._isUpdating) {
      console.log('🔄 Skipping cart refresh - initialization or update in progress');
      return;
    }

    // Don't refresh if Kinde callback is in progress
    if (window.kindeCallbackInProgress) {
      console.log('🔄 Skipping cart refresh - Kinde callback in progress');
      return;
    }

    // Don't refresh if we already have a recent cart (within last 5 seconds)
    if (this.cart && this._lastCartUpdate && (Date.now() - this._lastCartUpdate) < 5000) {
      console.log('🔄 Skipping cart refresh - cart was updated recently');
      return;
    }

    // Clear existing timeout
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }

    console.log('🔄 Scheduling cart refresh in 2 seconds...');

    // Set new timeout with longer delay
    this._refreshTimeout = setTimeout(() => {
      // Double-check we're not initializing when timeout fires
      if (!this._initPromise && !this._isUpdating && !this._isNotifying && !window.kindeCallbackInProgress) {
        console.log('🔄 Executing scheduled cart refresh');
        this.getCart();
      } else {
        console.log('🔄 Cancelled scheduled cart refresh - conditions changed');
      }
      this._refreshTimeout = null;
    }, 5000); // 5 second debounce (increased from 2 seconds to reduce API calls)
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
    if (this._isUpdating || this._isNotifying) {
      return; // Prevent recursive updates and duplicate notifications
    }

    this._isNotifying = true;
    this._lastCartUpdate = Date.now(); // Track when cart was last updated
    try {
      this.listeners.forEach(callback => {
        try {
          callback(this.cart);
        } catch (error) {
          console.error('Error in cart listener:', error);
        }
      });
      this.saveToLocalStorage();
    } finally {
      this._isNotifying = false;
    }
  }

  /**
   * Save cart to localStorage for persistence
   */
  saveToLocalStorage() {
    // Don't save to localStorage if we're updating from storage (prevents infinite loop)
    if (this._isUpdatingFromStorage) {
      return;
    }

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

    // Prevent too frequent API calls (debounce)
    const now = Date.now();
    if (this._lastCartUpdate && (now - this._lastCartUpdate) < 2000) {
      console.log('🔄 Cart API call debounced - returning cached cart');
      return this.cart;
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

        // Ensure totalItems is consistent (backend sends it, but make sure it's calculated correctly)
        if (this.cart.items) {
          this.cart.totalItems = this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
        }

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
      // Create a unique key for this request to prevent duplicates
      const requestKey = `addToCart-${menuItemId}-${quantity}-${size}-${JSON.stringify(addons)}-${specialInstructions}`;

      // Check if this exact request is already pending
      if (this._pendingRequests.has(requestKey)) {
        console.log('🔄 Duplicate add to cart request detected, waiting for existing request...');
        return await this._pendingRequests.get(requestKey);
      }

      const cartData = {
        menuItemId,
        quantity,
        size,
        addons,
        specialInstructions
      };

      // Create the request promise and store it
      const requestPromise = this._executeAddToCart(cartData, quantity);
      this._pendingRequests.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up the pending request
        this._pendingRequests.delete(requestKey);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showError(error.message || 'Failed to add item to cart. Please try again.');
      throw error;
    }
  }

  /**
   * Execute the actual add to cart request
   */
  async _executeAddToCart(cartData, quantity) {
    let response;

    if (this.isAuthenticated) {
      response = await httpClient.post('/api/shop/cart/items', cartData);
    } else {
      response = await httpClient.post(`/api/shop/guest/cart/${this.sessionId}`, cartData);
    }

    if (response.success) {
      // Update cart from response data instead of making another API call
      if (response.data && response.data.cart) {
        this.cart = response.data.cart;
        this.calculateCartTotals();
        this.notifyListeners();
      } else {
        // Only refresh if response doesn't contain cart data
        await this.getCart();
      }

      // Show success toast
      const quantityText = quantity === 1 ? '1 item' : `${quantity} items`;
      showSuccess(`${quantityText} added to cart successfully!`);

      return response;
    } else {
      throw new Error(response.message || 'Failed to add item to cart');
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
        // Update cart from response data instead of making another API call
        if (response.data && response.data.cart) {
          this.cart = response.data.cart;
          this.calculateCartTotals();
          this.notifyListeners();
        } else {
          // Only refresh if response doesn't contain cart data
          await this.getCart();
        }

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
        // Update cart from response data instead of making another API call
        if (response.data && response.data.cart) {
          this.cart = response.data.cart;
          this.calculateCartTotals();
          this.notifyListeners();
        } else {
          // Only refresh if response doesn't contain cart data
          await this.getCart();
        }
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
      // Re-check authentication state before clearing cart
      this.isAuthenticated = this.checkUserAuthentication();

      console.log('🗑️ Clearing cart:', {
        isAuthenticated: this.isAuthenticated,
        sessionId: this.sessionId,
        user: getCurrentUser()
      });

      let response;
      let fallbackAttempted = false;

      try {
        if (this.isAuthenticated) {
          console.log('🔐 Clearing authenticated user cart');
          response = await httpClient.delete('/api/shop/cart');
        } else {
          console.log('👤 Clearing guest cart with sessionId:', this.sessionId);
          response = await httpClient.delete(`/api/shop/guest/cart/${this.sessionId}`);
        }
      } catch (apiError) {
        console.warn('⚠️ Primary cart clear failed, trying fallback:', apiError.message);

        // Try the opposite method as fallback
        try {
          if (!this.isAuthenticated) {
            console.log('🔄 Fallback: Trying authenticated cart clear');
            response = await httpClient.delete('/api/shop/cart');
          } else {
            console.log('🔄 Fallback: Trying guest cart clear');
            response = await httpClient.delete(`/api/shop/guest/cart/${this.sessionId}`);
          }
          fallbackAttempted = true;
        } catch (fallbackError) {
          console.error('❌ Both cart clear methods failed');
          throw apiError; // Throw the original error
        }
      }

      console.log('🗑️ Clear cart response:', response, fallbackAttempted ? '(via fallback)' : '');

      if (response && response.success) {
        this.clearLocalStorage(); // Clear localStorage
        // Set empty cart instead of making another API call
        this.cart = {
          items: [],
          subtotal: 0,
          totalItems: 0,
          tax: 0,
          total: 0
        };
        this.notifyListeners();
        console.log('✅ Cart cleared successfully' + (fallbackAttempted ? ' (via fallback)' : ''));
        return response;
      } else {
        // If API call failed but we have a response, clear locally anyway
        console.warn('⚠️ API cart clear failed, clearing locally');
        this.clearLocalStorage();
        this.cart = {
          items: [],
          subtotal: 0,
          totalItems: 0,
          tax: 0,
          total: 0
        };
        this.notifyListeners();
        return { success: true, message: 'Cart cleared locally' };
      }
    } catch (error) {
      console.error('❌ Error clearing cart:', error);

      // Always clear locally as a last resort
      console.log('🔄 Clearing cart locally as fallback');
      this.clearLocalStorage();
      this.cart = {
        items: [],
        subtotal: 0,
        totalItems: 0,
        tax: 0,
        total: 0
      };
      this.notifyListeners();

      // Don't show error for cart clearing during checkout - it's not critical
      // showError(error.message || 'Failed to clear cart');
      return { success: true, message: 'Cart cleared locally' };
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
    this.cart.totalItems = this.cart.items.reduce((sum, item) => sum + item.quantity, 0); // Total quantity (matches backend)
    this.cart.totalQuantity = this.cart.items.reduce((sum, item) => sum + item.quantity, 0); // Total quantity
  }

  /**
   * Get cart item count (total quantity to match backend calculation)
   */
  getItemCount() {
    return this.cart && this.cart.items ? this.cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
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

// Create and export singleton instance with duplicate prevention
let cartService;
if (typeof window !== 'undefined' && window.cartService) {
  // Use existing instance if already created
  cartService = window.cartService;
  console.log('🔄 Using existing cart service instance');
} else {
  // Create new instance
  cartService = new CartService();
  if (typeof window !== 'undefined') {
    window.cartService = cartService;
  }
  console.log('✅ Created new cart service instance');
}

export { cartService };



export default cartService;
