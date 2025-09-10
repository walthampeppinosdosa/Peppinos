/**
 * Kinde Auth Callback Handler
 * Handles the authentication callback from Kinde and syncs user data
 */

import { loginUser, getRedirectUrl } from '../auth.js';
import { showSuccess, showError } from '../ui.js';
import { CONFIG } from '../config.js';
import { kindeService } from '../services/kinde-service.js';

/**
 * Auth Callback Handler
 */
class AuthCallbackHandler {
  constructor() {
    this.loadingElement = document.getElementById('authLoading');
    this.loadingText = document.getElementById('loadingText');
    this.successMessage = document.getElementById('successMessage');
    this.errorMessage = document.getElementById('errorMessage');
    this.welcomeText = document.getElementById('welcomeText');
    this.errorText = document.getElementById('errorText');
    
    this.init();
  }

  async init() {
    try {
      // Handle the authentication callback using Kinde service
      await this.handleAuthCallback();

    } catch (error) {
      console.error('Auth callback error:', error);
      this.showError('Failed to complete authentication. Please try again.');
    }
  }

  async handleAuthCallback() {
    try {
      this.updateLoadingText('Verifying authentication...');

      // Handle Kinde callback using the service
      const result = await kindeService.handleCallback();

      if (!result || !result.user) {
        throw new Error('Failed to get user information');
      }

      this.updateLoadingText('Setting up your account...');

      // Sync user data with backend
      await this.syncKindeUser(result.user, result.tokens.access_token);

    } catch (error) {
      console.error('Auth callback handling error:', error);
      this.showError(error.message || 'Authentication failed. Please try again.');
    }
  }

  async syncKindeUser(kindeUser, accessToken) {
    try {
      if (!accessToken) {
        throw new Error('Failed to get authentication token');
      }

      // Send user data to backend for sync/storage
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/auth/kinde-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          kindeId: kindeUser.id,
          email: kindeUser.email,
          name: kindeUser.given_name && kindeUser.family_name
            ? `${kindeUser.given_name} ${kindeUser.family_name}`
            : kindeUser.email,
          profileImage: kindeUser.picture,
          isEmailVerified: kindeUser.email_verified || false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync user data');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to sync user data');
      }

      // Store authentication data
      const user = loginUser(data.data);
      
      // Show success and redirect
      this.showSuccess(user);

    } catch (error) {
      console.error('Kinde user sync error:', error);
      
      // Logout from Kinde on sync failure
      try {
        kindeService.logout();
      } catch (logoutError) {
        console.error('Logout error:', logoutError);
      }
      
      throw new Error('Failed to set up your account. Please try signing in again.');
    }
  }

  updateLoadingText(text) {
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
  }

  showSuccess(user) {
    // Hide loading
    this.loadingElement.style.display = 'none';
    
    // Update welcome message
    this.welcomeText.textContent = `Welcome, ${user.name}! Your account has been set up successfully.`;
    
    // Show success message
    this.successMessage.style.display = 'block';
    
    // Show success toast
    showSuccess(`Welcome, ${user.name}!`);
    
    // Redirect after a delay
    const redirectUrl = getRedirectUrl('./index.html');
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 2000);
  }

  showError(message) {
    // Hide loading
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }

    // Update error message
    if (this.errorText) {
      this.errorText.textContent = message;
    }
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
    }

    // Show error container
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
      errorContainer.style.display = 'block';
    }

    // Show error toast
    showError(message);
  }
}

// Initialize callback handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AuthCallbackHandler();
});

// Export the class
export { AuthCallbackHandler as AuthCallback };

// Handle page unload to clean up
window.addEventListener('beforeunload', () => {
  // Clean up any pending operations
});
