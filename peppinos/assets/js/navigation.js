/**
 * Navigation Utility Module
 * Handles dynamic navigation updates based on authentication state
 */

import { isAuthenticated, getCurrentUser, logoutUser, addAuthListener } from './auth.js';
import { showSuccess, showError } from './ui.js';
import { cartService } from './services/cart-service.js';

/**
 * Navigation Manager
 */
class NavigationManager {
  constructor() {
    this.navbar = document.querySelector('[data-navbar]');
    this.headerActions = document.querySelector('.header-actions');
    this.authButtons = document.getElementById('auth-buttons');
    this.navbarActions = document.querySelector('.navbar-actions');
    this._cartUpdateTimeout = null; // For debouncing cart updates
    this._lastCartCount = null; // Track last cart count to prevent unnecessary updates

    this.init();
  }

  async init() {
    // Listen for authentication state changes
    addAuthListener(this.handleAuthStateChange.bind(this));

    // Ensure DOM elements are ready
    await this.waitForElements();

    // Update navigation immediately
    this.updateNavigation();

    // Initialize cart system (centralized initialization)
    await this.initializeCartSystem();

    // Setup mobile header layout after everything is ready
    setTimeout(() => {
      this.setupMobileHeaderLayout();
    }, 200);
  }

  async waitForElements() {
    // Wait for auth-buttons element to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    while (!this.authButtons && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.authButtons = document.getElementById('auth-buttons');
      attempts++;
    }

    if (!this.authButtons) {
      console.warn('auth-buttons element not found after waiting');
    }
  }

  handleAuthStateChange(isAuth, user) {
    this.updateNavigation();
  }

  updateNavigation() {
    if (isAuthenticated()) {
      this.showAuthenticatedNav();
    } else {
      this.showGuestNav();
    }

    // Re-setup mobile layout after navigation update
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        this.setupMobileHeaderLayout();
      }, 100);
    }
  }

  showGuestNav() {
    // Update auth buttons for guests (preserve cart icon and other header elements)
    if (this.authButtons) {
      this.authButtons.innerHTML = `
        <a href="./login.html" class="btn btn-secondary">
          <span class="text text-1">Sign In</span>
          <span class="text text-2" aria-hidden="true">Sign In</span>
        </a>
      `;
    }

    // Update navbar actions for guests
    if (this.navbarActions) {
      this.navbarActions.innerHTML = `
        <a href="https://www.google.com/maps/place/Peppino's+Dosa" target="_blank" class="btn btn-google navbar-btn" rel="noopener">
          <span class="text text-1">Google Business</span>
          <span class="text text-2" aria-hidden="true">Google Business</span>
        </a>

        <a href="./login.html" class="btn btn-secondary navbar-btn">
          <span class="text text-1">Sign In</span>
          <span class="text text-2" aria-hidden="true">Sign In</span>
        </a>
      `;
    }
  }

  showAuthenticatedNav() {
    const user = getCurrentUser();
    const userName = user ? user.name : 'User';
    const userInitials = this.getUserInitials(userName);

    // Update auth buttons for authenticated users (preserve cart icon and other header elements)
    if (this.authButtons) {
      this.authButtons.innerHTML = `
        <div class="user-menu" style="position: relative;">
          <button class="user-menu-toggle" id="userMenuToggle" style="display: flex; align-items: center; background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background 0.3s ease;" title="${userName}">
            <div class="user-avatar" style="width: 40px; height: 40px; background: var(--gold-crayola); color: var(--smoky-black-1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem;">
              ${userInitials}
            </div>
          </button>

          <div class="user-dropdown" id="userDropdown" style="display: none; position: absolute; top: 100%; right: 0; background: var(--eerie-black-2); border: 1px solid var(--white-alpha-10); border-radius: 8px; min-width: 200px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3); z-index: 1000; margin-top: 0.5rem;">
            <div style="padding: 1rem; border-bottom: 1px solid var(--white-alpha-10);">
              <p style="color: var(--white); font-weight: 600; margin-bottom: 0.25rem;">${userName}</p>
              <p style="color: var(--quick-silver); font-size: 0.85rem;">${user ? user.email : ''}</p>
            </div>
            <div style="padding: 0.5rem 0;">
              <a href="./profile.html" class="dropdown-item" style="display: block; padding: 0.75rem 1rem; color: var(--white); text-decoration: none; transition: background 0.3s ease;">
                <ion-icon name="person-outline" style="margin-right: 0.5rem;"></ion-icon>
                My Profile
              </a>
              <a href="./orders.html" class="dropdown-item" style="display: block; padding: 0.75rem 1rem; color: var(--white); text-decoration: none; transition: background 0.3s ease;">
                <ion-icon name="receipt-outline" style="margin-right: 0.5rem;"></ion-icon>
                My Orders
              </a>
              <a href="./cart.html" class="dropdown-item" style="display: block; padding: 0.75rem 1rem; color: var(--white); text-decoration: none; transition: background 0.3s ease; position: relative;">
                <ion-icon name="bag-outline" style="margin-right: 0.5rem;"></ion-icon>
                Cart
                <span class="dropdown-cart-count" id="dropdownCartCount" style="position: absolute; top: 0.5rem; right: 1rem; background: var(--gold-crayola); color: var(--eerie-black-1); font-size: 11px; font-weight: 600; min-width: 16px; height: 16px; border-radius: 50%; display: none; align-items: center; justify-content: center; line-height: 1;">0</span>
              </a>
              <div style="border-top: 1px solid var(--white-alpha-10); margin: 0.5rem 0;"></div>
              <button class="dropdown-item logout-btn" id="logoutBtn" style="display: block; width: 100%; text-align: left; padding: 0.75rem 1rem; color: var(--white); background: none; border: none; cursor: pointer; transition: background 0.3s ease;">
                <ion-icon name="log-out-outline" style="margin-right: 0.5rem;"></ion-icon>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      `;

      // Add dropdown functionality
      this.setupUserDropdown();

      // Update cart count after dropdown is created (debounced)
      this.debouncedUpdateCartCount();
    }

    // Update navbar actions for authenticated users (mobile)
    if (this.navbarActions) {
      this.navbarActions.innerHTML = `
        <a href="https://www.google.com/maps/place/Peppino's+Dosa" target="_blank" class="btn btn-google navbar-btn" rel="noopener">
          <span class="text text-1">Google Business</span>
          <span class="text text-2" aria-hidden="true">Google Business</span>
        </a>

        <div class="mobile-user-section">
          <div class="mobile-user-info">
            <div class="user-avatar-mobile">
              ${userInitials}
            </div>
            <div class="user-details">
              <p class="user-name">${userName}</p>
              <p class="user-email">${user ? user.email : ''}</p>
            </div>
          </div>

          <div class="mobile-nav-buttons">
            <a href="./profile.html" class="mobile-nav-btn profile-btn">
              <ion-icon name="person-outline" class="btn-icon"></ion-icon>
              <span class="btn-text">My Profile</span>
            </a>
            <a href="./orders.html" class="mobile-nav-btn orders-btn">
              <ion-icon name="receipt-outline" class="btn-icon"></ion-icon>
              <span class="btn-text">My Orders</span>
            </a>
            <a href="./cart.html" class="mobile-nav-btn cart-btn">
              <ion-icon name="bag-outline" class="btn-icon"></ion-icon>
              <span class="btn-text">Cart</span>
              <span class="mobile-cart-badge" id="mobileCartCount">0</span>
            </a>
            <button class="mobile-nav-btn logout-btn" id="logoutBtnMobile">
              <ion-icon name="log-out-outline" class="btn-icon"></ion-icon>
              <span class="btn-text">Sign Out</span>
            </button>
          </div>
        </div>
      `;

      // Add mobile logout functionality
      this.setupMobileLogout();

      // Update cart count after mobile navigation is created (debounced)
      this.debouncedUpdateCartCount();
    }
  }

  setupUserDropdown() {
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userMenuToggle && userDropdown) {
      // Toggle dropdown
      userMenuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent any other click handlers
        const isVisible = userDropdown.style.display === 'block';
        userDropdown.style.display = isVisible ? 'none' : 'block';
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!userMenuToggle.contains(e.target) && !userDropdown.contains(e.target)) {
          userDropdown.style.display = 'none';
        }
      });

      // Prevent nav toggle from interfering with user menu
      const userMenuContainer = userMenuToggle.closest('.user-menu');
      if (userMenuContainer) {
        userMenuContainer.addEventListener('click', (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
        });
      }

      // Add hover effects to dropdown items
      const dropdownItems = userDropdown.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
          item.style.background = 'var(--white-alpha-10)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });
      });

      // Add hover effect to user menu toggle
      userMenuToggle.addEventListener('mouseenter', () => {
        userMenuToggle.style.background = 'var(--white-alpha-10)';
      });
      userMenuToggle.addEventListener('mouseleave', () => {
        userMenuToggle.style.background = 'none';
      });
    }

    // Setup logout functionality
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
  }

  setupMobileLogout() {
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (logoutBtnMobile) {
      logoutBtnMobile.addEventListener('click', this.handleLogout.bind(this));
    }
  }

  async handleLogout() {
    try {
      // Show loading state
      showSuccess('Signing out...');
      
      // Logout user
      logoutUser();
      
      // Redirect to home page
      setTimeout(() => {
        window.location.href = './index.html';
      }, 1000);
      
    } catch (error) {
      console.error('Logout error:', error);
      showError('Failed to sign out. Please try again.');
    }
  }

  getUserInitials(name) {
    if (!name) return 'U';

    const nameParts = name.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    } else {
      return nameParts[0][0].toUpperCase();
    }
  }

  /**
   * Debounced cart count update to prevent excessive calls
   */
  debouncedUpdateCartCount() {
    // Clear existing timeout
    if (this._cartUpdateTimeout) {
      clearTimeout(this._cartUpdateTimeout);
    }

    // Set new timeout with debounce
    this._cartUpdateTimeout = setTimeout(() => {
      this.updateCartCountAfterRender();
      this._cartUpdateTimeout = null;
    }, 100); // 100ms debounce
  }

  /**
   * Update cart count after navigation elements are rendered
   * Uses already loaded cart data to avoid excessive API calls
   */
  updateCartCountAfterRender() {
    try {
      // Use already loaded cart data instead of making new API call
      const cart = cartService.cart;
      const count = cart ? (cart.totalItems || cart.items?.length || 0) : 0;
      this.updateCartCount(count);
    } catch (error) {
      console.error('Error getting cart for navigation update:', error);
    }
  }

  /**
   * Update cart count badges in dropdown and mobile navigation
   * @param {number} count - Number of items in cart
   */
  updateCartCount(count) {
    // Prevent unnecessary updates if count hasn't changed
    if (this._lastCartCount === count) {
      return;
    }
    this._lastCartCount = count;

    // Update main cart icon count
    const mainCartCount = document.getElementById('cartCount') || document.getElementById('cart-count');
    if (mainCartCount) {
      mainCartCount.textContent = count;
      mainCartCount.style.display = count > 0 ? 'flex' : 'none';
    }

    // Update dropdown cart count
    const dropdownCartCount = document.getElementById('dropdownCartCount');
    if (dropdownCartCount) {
      dropdownCartCount.textContent = count;
      dropdownCartCount.style.display = count > 0 ? 'flex' : 'none';
    }

    // Update mobile cart count
    const mobileCartCount = document.getElementById('mobileCartCount');
    if (mobileCartCount) {
      mobileCartCount.textContent = count;
      if (count > 0) {
        mobileCartCount.style.display = 'flex';
        mobileCartCount.style.opacity = '1';
        mobileCartCount.style.visibility = 'visible';
      } else {
        mobileCartCount.style.display = 'none';
        mobileCartCount.style.opacity = '0';
        mobileCartCount.style.visibility = 'hidden';
      }
    }
  }

  /**
   * Setup mobile header layout: logo left, controls right (avatar+hamburger for authenticated, cart+hamburger for guest)
   */
  setupMobileHeaderLayout() {
    // Only apply on mobile devices
    if (window.innerWidth > 768) {
      this.cleanupMobileLayout();
      return;
    }

    const header = document.querySelector('.header');
    if (!header) return;

    const container = header.querySelector('.container');
    if (!container) return;

    // Clean up any existing mobile controls first
    this.cleanupMobileLayout();

    // Create mobile right controls container
    const mobileRightControls = document.createElement('div');
    mobileRightControls.className = 'mobile-right-controls';

    // Get elements
    const cartIcon = container.querySelector('.cart-icon-btn');
    const hamburger = container.querySelector('.nav-open-btn');
    const headerActions = container.querySelector('.header-actions');
    const isAuthenticated = headerActions && headerActions.querySelector('.user-menu');

    if (isAuthenticated) {
      // For authenticated users: user avatar + hamburger together on RIGHT
      const userMenu = headerActions.querySelector('.user-menu');
      if (userMenu) {
        // Move the original user menu to right controls
        mobileRightControls.appendChild(userMenu);
      }

      // Add hamburger next to user avatar on right
      if (hamburger) {
        mobileRightControls.appendChild(hamburger);
      }

      // Hide cart icon for authenticated users on mobile
      if (cartIcon) {
        cartIcon.style.display = 'none';
      }
    } else {
      // For guest users: cart + hamburger together on RIGHT (same layout as authenticated)
      if (cartIcon) {
        console.log('📱 Setting up cart icon for guest mobile layout');
        cartIcon.style.display = 'flex';
        cartIcon.style.visibility = 'visible';
        cartIcon.style.opacity = '1';
        mobileRightControls.appendChild(cartIcon);

        // Ensure cart icon click works properly in mobile layout
        this.ensureCartIconFunctionality(cartIcon);

        console.log('📱 Cart icon added to mobile controls:', cartIcon);
      } else {
        console.warn('📱 Cart icon not found for guest mobile layout');
      }

      // Add hamburger next to cart on right
      if (hamburger) {
        mobileRightControls.appendChild(hamburger);
      }
    }

    // Add right controls to container
    container.appendChild(mobileRightControls);

    // Handle window resize
    if (!this._resizeHandlerAdded) {
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
          this.cleanupMobileLayout();
        } else {
          // Delay to ensure DOM is ready
          setTimeout(() => this.setupMobileHeaderLayout(), 100);
        }
      });
      this._resizeHandlerAdded = true;
    }
  }

  /**
   * Ensure cart icon functionality when moved to mobile controls
   * Uses the same approach as user avatar fix
   */
  ensureCartIconFunctionality(cartIcon) {
    // Remove any existing navigation toggle attributes that might interfere
    cartIcon.removeAttribute('data-nav-toggler');

    // Add a direct click handler for cart functionality - same pattern as user avatar
    // Use a unique identifier to prevent duplicate listeners
    if (!cartIcon.dataset.cartHandlerAdded) {
      // Add multiple event listeners to ensure cart click is captured
      // Use capture phase to handle before any other listeners
      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent any other click handlers - same as user avatar
        console.log('🛒 Mobile cart icon clicked directly (capture phase)');

        // Trigger cart opening directly
        if (window.cartUIInstance) {
          window.cartUIInstance.openCart();
        } else {
          console.error('Cart UI instance not found');
        }
      }, { capture: true }); // Capture phase - handles before bubble phase

      // Also add bubble phase handler as backup
      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🛒 Mobile cart icon clicked directly (bubble phase backup)');

        if (window.cartUIInstance) {
          window.cartUIInstance.openCart();
        }
      }, { capture: false });

      // Add mousedown event as additional protection
      cartIcon.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🛒 Cart icon mousedown - preventing nav toggle');
      }, { capture: true });

      // Prevent nav toggle from interfering with cart icon - same pattern as user menu container
      const cartIconContainer = cartIcon.closest('.mobile-right-controls');
      if (cartIconContainer) {
        // Add container-level protection to prevent event bubbling
        cartIconContainer.addEventListener('click', (e) => {
          // Only stop propagation if the click is on the cart icon
          if (e.target.closest('.cart-icon-btn, #cartIcon')) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('🛒 Container-level cart click protection activated');
          }
        }, { capture: true });
      }

      // Mark as having handler to prevent duplicates
      cartIcon.dataset.cartHandlerAdded = 'true';
    }

    // Ensure cart icon is visible
    cartIcon.style.display = 'flex';
    cartIcon.style.visibility = 'visible';

    return cartIcon;
  }

  /**
   * Clean up mobile layout elements
   */
  cleanupMobileLayout() {
    const container = document.querySelector('.header .container');
    if (!container) return;

    // Remove mobile control containers
    const mobileLeftControls = container.querySelector('.mobile-left-controls');
    const mobileRightControls = container.querySelector('.mobile-right-controls');

    if (mobileLeftControls) {
      // Move hamburger back to original position (legacy cleanup)
      const hamburger = mobileLeftControls.querySelector('.nav-open-btn');
      if (hamburger) {
        container.appendChild(hamburger);
      }
      mobileLeftControls.remove();
    }

    if (mobileRightControls) {
      // Move user menu back to header-actions
      const userMenu = mobileRightControls.querySelector('.user-menu');
      const headerActions = container.querySelector('.header-actions');
      if (userMenu && headerActions) {
        headerActions.appendChild(userMenu);
      }

      // Move hamburger back to original position (for both authenticated and guest users)
      const hamburger = mobileRightControls.querySelector('.nav-open-btn');
      if (hamburger) {
        container.appendChild(hamburger);
      }

      // Move cart back to header-actions (for guest users)
      const cartIcon = mobileRightControls.querySelector('.cart-icon-btn');
      if (cartIcon && headerActions) {
        cartIcon.style.display = 'flex';
        headerActions.appendChild(cartIcon);
      }
      mobileRightControls.remove();
    }

    // Ensure cart icon is visible on desktop
    const cartIcon = container.querySelector('.cart-icon-btn');
    if (cartIcon) {
      cartIcon.style.display = 'flex';
    }
  }



  /**
   * Centralized cart system initialization
   * This prevents multiple initializations and infinite API calls
   */
  async initializeCartSystem() {
    try {
      // Prevent multiple initializations globally
      if (window.cartSystemInitialized || window.cartSystemInitializing) {
        console.log('🔄 Cart system already initialized or initializing, skipping...');
        return;
      }

      // Mark as initializing to prevent race conditions
      window.cartSystemInitializing = true;
      console.log('🚀 Initializing cart system...');

      // Initialize cart service ONCE
      if (!cartService._initialized) {
        await cartService.init();
      }

      // Initialize CartUI ONCE
      if (!window.cartUIInstance) {
        const { CartUI } = await import('./components/cart-ui.js');
        window.cartUIInstance = new CartUI();

        // Update cart display with current cart data
        const currentCart = cartService.cart;
        if (currentCart) {
          window.cartUIInstance.updateCartDisplay(currentCart);
        }
      }

      // Setup cart count listener ONCE (prevent multiple listeners)
      if (!window.cartNavigationListenerAdded) {
        cartService.addEventListener((cart) => {
          // Use consistent count calculation: total quantity (sum of all item quantities)
          const count = cart ? (cart.totalItems || cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0) : 0;
          this.updateCartCount(count);
        });
        window.cartNavigationListenerAdded = true;
      }

      // Update cart count from already loaded cart (avoid duplicate API call)
      const cart = cartService.cart; // Use already loaded cart from init()
      const count = cart ? (cart.totalItems || cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0) : 0;
      this.updateCartCount(count);

      // Mark as initialized
      window.cartSystemInitialized = true;
      window.cartSystemInitializing = false;

      // Clear Kinde callback flag if it was set
      if (window.kindeCallbackInProgress) {
        window.kindeCallbackInProgress = false;
        console.log('🔄 Cleared Kinde callback flag - cart system ready');
      }

      console.log('✅ Cart system initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing cart system:', error);
      window.cartSystemInitializing = false; // Reset flag on error
    }
  }
}

// Initialize navigation manager when DOM is loaded
let navigationManager = null;

function initializeNavigation() {
  if (!navigationManager) {
    navigationManager = new NavigationManager();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
  // DOM is already loaded, initialize immediately
  initializeNavigation();
}

export default NavigationManager;
