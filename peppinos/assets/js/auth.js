/**
 * Authentication Utility Module
 * Handles authentication state, token management, and user session
 */

import { CONFIG } from './config.js';

/**
 * Token Management
 */

// Get authentication token from localStorage
export const getAuthToken = () => {
  return localStorage.getItem(CONFIG.AUTH.TOKEN_KEY);
};

// Get refresh token from localStorage
export const getRefreshToken = () => {
  return localStorage.getItem(CONFIG.AUTH.REFRESH_TOKEN_KEY);
};

// Set authentication tokens
export const setAuthTokens = (accessToken, refreshToken = null) => {
  localStorage.setItem(CONFIG.AUTH.TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(CONFIG.AUTH.REFRESH_TOKEN_KEY, refreshToken);
  }
};

// Remove authentication data
export const removeAuthData = () => {
  localStorage.removeItem(CONFIG.AUTH.TOKEN_KEY);
  localStorage.removeItem(CONFIG.AUTH.REFRESH_TOKEN_KEY);
  localStorage.removeItem(CONFIG.AUTH.USER_KEY);
  localStorage.removeItem('peppinos_is_guest'); // Remove guest flag
};

// Check if token is expired
export const isTokenExpired = (token = null) => {
  const authToken = token || getAuthToken();
  if (!authToken) return true;

  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Get token expiry time
export const getTokenExpiry = (token = null) => {
  const authToken = token || getAuthToken();
  if (!authToken) return null;

  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    return new Date(payload.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * User Management
 */

// Get current user data
export const getCurrentUser = () => {
  const userData = localStorage.getItem(CONFIG.AUTH.USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

// Set current user data
export const setCurrentUser = (user) => {
  localStorage.setItem(CONFIG.AUTH.USER_KEY, JSON.stringify(user));
};

// Check if user is authenticated (including guest users)
export const isAuthenticated = () => {
  const token = getAuthToken();
  const isGuest = localStorage.getItem('peppinos_is_guest') === 'true';
  const hasValidToken = token && !isTokenExpired(token);
  const result = hasValidToken || isGuest;

  console.log('🔐 isAuthenticated check:', {
    token: token ? 'present' : 'missing',
    isGuest,
    hasValidToken,
    result
  });

  return result;
};

// Check if user is a guest
export const isGuestUser = () => {
  return localStorage.getItem('peppinos_is_guest') === 'true';
};

// Check if user is a registered user (not guest)
export const isRegisteredUser = () => {
  const token = getAuthToken();
  return token && !isTokenExpired(token) && !isGuestUser();
};

// Check if user has specific role
export const hasRole = (role) => {
  const user = getCurrentUser();
  return user && user.role === role;
};

// Check if user has any of the specified roles
export const hasAnyRole = (roles) => {
  const user = getCurrentUser();
  return user && roles.includes(user.role);
};

// Get user permissions
export const getUserPermissions = () => {
  const user = getCurrentUser();
  console.log('getUserPermissions called with user:', user);
  return user ? user.permissions || [] : [];
};

// Check if user has specific permission
export const hasPermission = (permission) => {
  const permissions = getUserPermissions();
  return permissions.includes(permission);
};

/**
 * Authentication State Management
 */

// Authentication event listeners
const authListeners = new Set();

// Add authentication state listener
export const addAuthListener = (callback) => {
  authListeners.add(callback);
  return () => authListeners.delete(callback);
};

// Notify authentication state change
const notifyAuthChange = (isAuthenticated, user = null) => {
  authListeners.forEach(callback => {
    try {
      callback(isAuthenticated, user);
    } catch (error) {
      console.error('Auth listener error:', error);
    }
  });
};

/**
 * Enhanced Authentication Service (consolidated from auth-service.js)
 */

// Service-style event listeners for compatibility
const serviceListeners = [];

export const addEventListener = (callback) => {
  serviceListeners.push(callback);
};

export const removeEventListener = (callback) => {
  const index = serviceListeners.indexOf(callback);
  if (index > -1) {
    serviceListeners.splice(index, 1);
  }
};

const notifyServiceListeners = (event, data) => {
  serviceListeners.forEach(callback => {
    try {
      callback(event, data);
    } catch (error) {
      console.error('Service listener error:', error);
    }
  });
};

// Check if user is actually authenticated (not guest)
export const isUserAuthenticated = () => {
  const user = getCurrentUser();
  const token = getAuthToken();
  const isGuest = isGuestUser();

  // User is authenticated if they have a valid token AND are not a guest
  // Check both user.id and user._id for compatibility
  const userId = user?.id || user?._id;
  return token && !isTokenExpired(token) && !isGuest && user && userId;
};

/**
 * Login Prompt Modal (from auth-service.js)
 */
export const showLoginPrompt = (message = 'Please sign in to continue with your order') => {
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
          <button class="auth-modal-close" aria-label="Close modal">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <div class="auth-modal-body">
          <p>${message}</p>
          <p>Your cart items will be saved and transferred to your account after signing in.</p>

          <div class="auth-options">
            <button class="btn-auth btn-guest" id="signInBtn">
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

    // Add modal to page
    document.body.appendChild(modal);

    // Handle modal interactions
    const handleModalClick = (e) => {
      if (e.target.id === 'signInBtn') {
        resolve({ action: 'signin' });
        redirectToLogin();
      } else if (e.target.id === 'signUpBtn') {
        resolve({ action: 'signup' });
        redirectToSignup();
      } else if (e.target.id === 'continueGuestBtn') {
        resolve({ action: 'guest' });
        closeModal();
      } else if (e.target.classList.contains('auth-modal-close') ||
                 e.target.closest('.auth-modal-close') ||
                 e.target.classList.contains('auth-modal-overlay')) {
        reject(new Error('Modal cancelled'));
        closeModal();
      }
    };

    const closeModal = () => {
      modal.removeEventListener('click', handleModalClick);
      document.body.removeChild(modal);
    };

    const redirectToLogin = () => {
      sessionStorage.setItem('auth_redirect', window.location.href);
      window.location.href = './login.html';
      closeModal();
    };

    const redirectToSignup = () => {
      sessionStorage.setItem('auth_redirect', window.location.href);
      window.location.href = './register.html';
      closeModal();
    };

    // Add event listener
    modal.addEventListener('click', handleModalClick);

    // Focus on modal for accessibility
    modal.focus();
  });
};

// Login user
export const loginUser = (authData) => {
  const { accessToken, refreshToken, user } = authData;

  // Clear any guest status
  localStorage.removeItem('peppinos_is_guest');

  setAuthTokens(accessToken, refreshToken);
  setCurrentUser(user);

  notifyAuthChange(true, user);
  notifyServiceListeners('authenticated', user);

  // Set up token refresh timer
  setupTokenRefresh();

  return user;
};

// Logout user
export const logoutUser = () => {
  const user = getCurrentUser();
  removeAuthData();
  notifyAuthChange(false, null);
  notifyServiceListeners('unauthenticated', null);

  // Clear any timers
  clearTokenRefreshTimer();

  return user;
};

/**
 * Token Refresh Management
 */

let refreshTimer = null;

// Setup automatic token refresh
export const setupTokenRefresh = () => {
  clearTokenRefreshTimer();
  
  const token = getAuthToken();
  if (!token || isTokenExpired(token)) return;
  
  const expiry = getTokenExpiry(token);
  if (!expiry) return;
  
  const refreshTime = expiry.getTime() - Date.now() - CONFIG.AUTH.TOKEN_EXPIRY_BUFFER;
  
  if (refreshTime > 0) {
    refreshTimer = setTimeout(async () => {
      try {
        await refreshAuthToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        logoutUser();
      }
    }, refreshTime);
  }
};

// Clear token refresh timer
export const clearTokenRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

// Refresh authentication token
export const refreshAuthToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    // Import authAPI here to avoid circular dependency
    const { authAPI } = await import('./api.js');
    const response = await authAPI.refreshToken(refreshToken);
    
    if (response.success) {
      setAuthTokens(response.data.accessToken, response.data.refreshToken);
      setupTokenRefresh();
      return response.data;
    } else {
      throw new Error(response.message || 'Token refresh failed');
    }
  } catch (error) {
    removeAuthData();
    throw error;
  }
};

/**
 * Session Management
 */

// Check session validity
export const checkSession = () => {
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user || isTokenExpired(token)) {
    logoutUser();
    return false;
  }
  
  return true;
};

// Initialize authentication state
export const initializeAuth = () => {
  const isAuth = checkSession();

  if (isAuth) {
    setupTokenRefresh();
    const user = getCurrentUser();
    notifyAuthChange(true, user);
    notifyServiceListeners('authenticated', user);
  } else {
    notifyAuthChange(false, null);
    notifyServiceListeners('unauthenticated', null);
  }

  return isAuth;
};

/**
 * Cart Transfer Functionality (from auth-service.js)
 */
export const transferTempCartToUser = async () => {
  try {
    // Get temporary cart data
    const tempCart = localStorage.getItem('peppinos_cart');
    if (!tempCart) return;

    const cartData = JSON.parse(tempCart);
    if (!cartData.items || cartData.items.length === 0) return;

    // Import httpClient dynamically to avoid circular dependencies
    const { httpClient } = await import('./api.js');

    // Transfer cart to authenticated user
    const response = await httpClient.post('/api/shop/cart/transfer', {
      tempCartData: cartData
    });

    if (response.success) {
      // Clear temporary cart
      localStorage.removeItem('peppinos_cart');

      // Notify listeners about cart transfer
      notifyServiceListeners('cartTransferred', response.data);

      console.log('✅ Cart transferred successfully');
      return response.data;
    }
  } catch (error) {
    console.error('❌ Failed to transfer cart:', error);
    throw error;
  }
};

/**
 * Route Protection
 */

// Redirect to login if not authenticated
export const requireAuth = (redirectUrl = './login.html') => {
  if (!isAuthenticated()) {
    const currentUrl = window.location.pathname + window.location.search;
    const loginUrl = `${redirectUrl}?redirect=${encodeURIComponent(currentUrl)}`;
    window.location.href = loginUrl;
    return false;
  }
  return true;
};

// Redirect to home if already authenticated
export const requireGuest = (redirectUrl = './index.html') => {
  console.log('🔍 requireGuest called from:', new Error().stack.split('\n')[2]);
  console.log('🔐 Current auth status:', isAuthenticated());
  console.log('📍 Current page:', window.location.href);

  if (isAuthenticated()) {
    console.log('🔄 User is authenticated, redirecting from guest page to:', redirectUrl);
    window.location.href = redirectUrl;
    return false;
  }
  console.log('✅ User is not authenticated, staying on guest page');
  return true;
};

// Check role-based access
export const requireRole = (requiredRole, redirectUrl = './index.html') => {
  if (!isAuthenticated() || !hasRole(requiredRole)) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
};

/**
 * Utility Functions
 */

// Get redirect URL from query params
export const getRedirectUrl = (defaultUrl = './index.html') => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect');

  // If no redirect parameter, use default
  if (!redirectParam) {
    return defaultUrl;
  }

  // If redirect parameter is an absolute path starting with /, make it relative
  if (redirectParam.startsWith('/')) {
    // Convert absolute path to relative path within peppinos folder
    if (redirectParam === '/' || redirectParam === '/index.html') {
      return './index.html';
    }
    // For other absolute paths, try to make them relative
    return '.' + redirectParam;
  }

  // If it's already a relative path or full URL, use as is
  return redirectParam;
};

// Format user display name
export const getUserDisplayName = (user = null) => {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return 'Guest';
  
  return currentUser.name || currentUser.email || 'User';
};

// Get user avatar URL
export const getUserAvatar = (user = null) => {
  const currentUser = user || getCurrentUser();
  return currentUser?.profileImage || '/assets/images/default-avatar.png';
};

// Export authentication state for reactive updates
export const authState = {
  get isAuthenticated() { return isAuthenticated(); },
  get user() { return getCurrentUser(); },
  get token() { return getAuthToken(); }
};

// Initialize authentication on module load
if (typeof window !== 'undefined') {
  // Browser environment
  document.addEventListener('DOMContentLoaded', initializeAuth);
}

export default {
  // Token management
  getAuthToken,
  getRefreshToken,
  setAuthTokens,
  removeAuthData,
  isTokenExpired,

  // User management
  getCurrentUser,
  setCurrentUser,
  isAuthenticated,
  isUserAuthenticated,
  isGuestUser,
  isRegisteredUser,
  hasRole,
  hasAnyRole,
  hasPermission,

  // Authentication actions
  loginUser,
  logoutUser,
  refreshAuthToken,

  // Session management
  checkSession,
  initializeAuth,

  // Route protection
  requireAuth,
  requireGuest,
  requireRole,

  // Service compatibility
  addEventListener,
  removeEventListener,
  showLoginPrompt,
  transferTempCartToUser,

  // Utilities
  getRedirectUrl,
  getUserDisplayName,
  getUserAvatar,
  authState
};
