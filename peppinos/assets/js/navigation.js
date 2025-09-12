/**
 * Navigation Utility Module
 * Handles dynamic navigation updates based on authentication state
 */

import { isAuthenticated, getCurrentUser, logoutUser, addAuthListener } from './auth.js';
import { showSuccess, showError } from './ui.js';

/**
 * Navigation Manager
 */
class NavigationManager {
  constructor() {
    this.navbar = document.querySelector('[data-navbar]');
    this.headerActions = document.querySelector('.header-actions');
    this.navbarActions = document.querySelector('.navbar-actions');
    
    this.init();
  }

  init() {
    // Listen for authentication state changes
    addAuthListener(this.handleAuthStateChange.bind(this));
    
    // Update navigation on page load
    this.updateNavigation();
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
  }

  showGuestNav() {
    // Update header actions for guests
    if (this.headerActions) {
      this.headerActions.innerHTML = `
        <a href="https://www.google.com/maps/place/Peppino's+Dosa" target="_blank" class="btn btn-google" rel="noopener">
          <span class="text text-1">Google Reviews</span>
          <span class="text text-2" aria-hidden="true">Google Reviews</span>
        </a>
        
        <a href="login.html" class="btn btn-secondary">
          <span class="text text-1">Sign In</span>
          <span class="text text-2" aria-hidden="true">Sign In</span>
        </a>
      `;
    }

    // Update navbar actions for guests
    if (this.navbarActions) {
      this.navbarActions.innerHTML = `
        <a href="https://www.google.com/maps/place/Peppino's+Dosa" target="_blank" class="btn btn-google navbar-btn" rel="noopener">
          <span class="text text-1">Google Reviews</span>
          <span class="text text-2" aria-hidden="true">Google Reviews</span>
        </a>

        <a href="login.html" class="btn btn-secondary navbar-btn">
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

    // Update header actions for authenticated users
    if (this.headerActions) {
      this.headerActions.innerHTML = `
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
              <a href="profile.html" class="dropdown-item" style="display: block; padding: 0.75rem 1rem; color: var(--white); text-decoration: none; transition: background 0.3s ease;">
                <ion-icon name="person-outline" style="margin-right: 0.5rem;"></ion-icon>
                My Profile
              </a>
              <a href="orders.html" class="dropdown-item" style="display: block; padding: 0.75rem 1rem; color: var(--white); text-decoration: none; transition: background 0.3s ease;">
                <ion-icon name="receipt-outline" style="margin-right: 0.5rem;"></ion-icon>
                My Orders
              </a>
              <a href="cart.html" class="dropdown-item" style="display: block; padding: 0.75rem 1rem; color: var(--white); text-decoration: none; transition: background 0.3s ease;">
                <ion-icon name="bag-outline" style="margin-right: 0.5rem;"></ion-icon>
                Cart
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
    }

    // Update navbar actions for authenticated users (mobile)
    if (this.navbarActions) {
      this.navbarActions.innerHTML = `
        <div style="text-align: center; padding: 1rem; border-top: 1px solid var(--white-alpha-10);">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1rem;">
            <div class="user-avatar" style="width: 40px; height: 40px; background: var(--gold-crayola); color: var(--smoky-black-1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600;">
              ${userInitials}
            </div>
            <div style="text-align: left;">
              <p style="color: var(--white); font-weight: 600; margin-bottom: 0.25rem;">${userName}</p>
              <p style="color: var(--quick-silver); font-size: 0.85rem;">${user ? user.email : ''}</p>
            </div>
          </div>
          
          <div style="display: grid; gap: 0.5rem;">
            <a href="profile.html" class="btn btn-secondary navbar-btn" style="justify-content: center;">
              <span class="text text-1">My Profile</span>
              <span class="text text-2" aria-hidden="true">My Profile</span>
            </a>
            <a href="orders.html" class="btn btn-secondary navbar-btn" style="justify-content: center;">
              <span class="text text-1">My Orders</span>
              <span class="text text-2" aria-hidden="true">My Orders</span>
            </a>
            <a href="cart.html" class="btn btn-secondary navbar-btn" style="justify-content: center;">
              <span class="text text-1">Cart</span>
              <span class="text text-2" aria-hidden="true">Cart</span>
            </a>
            <button class="btn btn-secondary navbar-btn logout-btn-mobile" id="logoutBtnMobile" style="justify-content: center;">
              <span class="text text-1">Sign Out</span>
              <span class="text text-2" aria-hidden="true">Sign Out</span>
            </button>
          </div>
        </div>
      `;

      // Add mobile logout functionality
      this.setupMobileLogout();
    }
  }

  setupUserDropdown() {
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userMenuToggle && userDropdown) {
      // Toggle dropdown
      userMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = userDropdown.style.display === 'block';
        userDropdown.style.display = isVisible ? 'none' : 'block';
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!userMenuToggle.contains(e.target) && !userDropdown.contains(e.target)) {
          userDropdown.style.display = 'none';
        }
      });

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
}

// Initialize navigation manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new NavigationManager();
});

export default NavigationManager;
