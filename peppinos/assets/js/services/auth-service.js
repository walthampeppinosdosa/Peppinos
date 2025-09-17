/**
 * Authentication Service
 * Handles user authentication and temporary cart management
 */

import { sessionManager } from './session-manager.js';
import { httpClient } from '../api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = [];
    this.init();
  }

  /**
   * Initialize auth service
   */
  init() {
    // Check if user is already authenticated
    this.checkAuthStatus();
    
    // Listen for session changes
    sessionManager.addEventListener((event, data) => {
      if (event === 'userLoggedOut') {
        this.handleLogout();
      }
    });
  }

  /**
   * Add event listener
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
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus() {
    try {
      // Check session manager first
      if (sessionManager.isAuthenticated()) {
        const userId = sessionManager.getUserId();
        if (userId) {
          // Verify with server
          const response = await httpClient.get('/api/auth/me');
          if (response.success && response.user) {
            this.user = response.user;
            this.isAuthenticated = true;
            this.notifyListeners('authenticated', this.user);
            return true;
          }
        }
      }
      
      // Not authenticated
      this.user = null;
      this.isAuthenticated = false;
      this.notifyListeners('unauthenticated', null);
      return false;
    } catch (error) {
      console.warn('Auth check failed:', error);
      this.user = null;
      this.isAuthenticated = false;
      this.notifyListeners('unauthenticated', null);
      return false;
    }
  }

  /**
   * Show login prompt
   */
  showLoginPrompt(message = 'Please sign in to continue with your order') {
    return new Promise((resolve, reject) => {
      // Close cart sidebar first if it's open
      if (window.cartUI && window.cartUI.isOpen) {
        window.cartUI.closeCart();
      }

      // Create login modal
      const modal = document.createElement('div');
      modal.className = 'auth-modal-overlay';
      modal.style.zIndex = '1000000'; // Higher than cart overlay
      modal.innerHTML = `
        <div class="auth-modal">
          <div class="auth-modal-header">
            <h3>Sign In Required</h3>
            <button class="auth-modal-close" aria-label="Close">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
          
          <div class="auth-modal-body">
            <p>${message}</p>
            <p>Your cart items will be saved and transferred to your account after signing in.</p>
            
            <div class="auth-options">
              <button class="btn-auth btn-signin" id="signInBtn">
                <ion-icon name="log-in-outline"></ion-icon>
                Sign In
              </button>
              
              <button class="btn-auth btn-signup" id="signUpBtn">
                <ion-icon name="person-add-outline"></ion-icon>
                Create Account
              </button>
              
              <button class="btn-auth btn-guest" id="continueGuestBtn">
                <ion-icon name="person-outline"></ion-icon>
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      `;

      // Add styles
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      // Add modal styles
      const style = document.createElement('style');
      style.textContent = `
        .auth-modal {
          background: var(--white);
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-2);
        }

        .auth-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--cultured);
        }

        .auth-modal-header h3 {
          margin: 0;
          color: var(--eerie-black-1);
          font-family: var(--ff-forum);
        }

        .auth-modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--quick-silver);
          padding: 0.25rem;
          border-radius: 4px;
          transition: var(--transition-1);
        }

        .auth-modal-close:hover {
          background: var(--cultured);
          color: var(--eerie-black-1);
        }

        .auth-modal-body {
          padding: 1.5rem;
        }

        .auth-modal-body p {
          margin-bottom: 1rem;
          color: var(--eerie-black-2);
          line-height: 1.6;
        }

        .auth-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .btn-auth {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-1);
          text-decoration: none;
        }

        .btn-signin {
          background: var(--gold-crayola);
          color: var(--eerie-black-1);
        }

        .btn-signin:hover {
          background: var(--golden-poppy);
        }

        .btn-signup {
          background: var(--eerie-black-1);
          color: var(--white);
        }

        .btn-signup:hover {
          background: var(--eerie-black-2);
        }

        .btn-guest {
          background: transparent;
          color: var(--eerie-black-1);
          border: 1px solid var(--cultured);
        }

        .btn-guest:hover {
          background: var(--cultured);
        }

        @media (max-width: 480px) {
          .auth-modal {
            width: 95%;
          }
          
          .auth-modal-header,
          .auth-modal-body {
            padding: 1rem;
          }
        }
      `;
      document.head.appendChild(style);

      // Add to DOM
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      // Event handlers
      const closeModal = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        document.body.style.overflow = '';
        reject(new Error('Login cancelled'));
      };

      modal.querySelector('.auth-modal-close').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      modal.querySelector('#signInBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        document.body.style.overflow = '';
        this.redirectToLogin();
        resolve({ action: 'signin' });
      });

      modal.querySelector('#signUpBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        document.body.style.overflow = '';
        this.redirectToSignup();
        resolve({ action: 'signup' });
      });

      modal.querySelector('#continueGuestBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        document.body.style.overflow = '';
        resolve({ action: 'guest' });
      });
    });
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    // Store current page for redirect after login
    sessionStorage.setItem('auth_redirect', window.location.href);
    window.location.href = '/login.html';
  }

  /**
   * Redirect to signup page
   */
  redirectToSignup() {
    // Store current page for redirect after signup
    sessionStorage.setItem('auth_redirect', window.location.href);
    window.location.href = '/register.html';
  }

  /**
   * Handle successful login
   */
  async handleLogin(userData) {
    this.user = userData;
    this.isAuthenticated = true;
    
    // Update session
    sessionManager.setAuthenticatedSession(userData.id, userData);
    
    // Notify listeners
    this.notifyListeners('authenticated', userData);
    
    // Handle cart transfer if needed
    await this.transferTempCartToUser();
    
    return userData;
  }

  /**
   * Handle logout
   */
  handleLogout() {
    this.user = null;
    this.isAuthenticated = false;
    sessionManager.logout();
    this.notifyListeners('unauthenticated', null);
  }

  /**
   * Transfer temporary cart to authenticated user
   */
  async transferTempCartToUser() {
    try {
      // Get temporary cart data
      const tempCart = localStorage.getItem('peppinos_cart');
      if (!tempCart) return;

      const cartData = JSON.parse(tempCart);
      if (!cartData.cart || !cartData.cart.items || cartData.cart.items.length === 0) {
        return;
      }

      // Transfer cart items to user account
      const response = await httpClient.post('/api/shop/cart/transfer', {
        tempCartItems: cartData.cart.items
      });

      if (response.success) {
        // Clear temporary cart
        localStorage.removeItem('peppinos_cart');
        
        // Notify about successful transfer
        this.notifyListeners('cartTransferred', response.cart);
        
        console.log('Cart transferred successfully');
      }
    } catch (error) {
      console.error('Failed to transfer cart:', error);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }
}

// Create and export singleton instance
export const authService = new AuthService();

// Make it globally accessible
window.authService = authService;

export default authService;
