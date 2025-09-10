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
  return (token && !isTokenExpired(token)) || isGuest;
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

// Login user
export const loginUser = (authData) => {
  const { accessToken, refreshToken, user } = authData;
  
  setAuthTokens(accessToken, refreshToken);
  setCurrentUser(user);
  
  notifyAuthChange(true, user);
  
  // Set up token refresh timer
  setupTokenRefresh();
  
  return user;
};

// Logout user
export const logoutUser = () => {
  const user = getCurrentUser();
  removeAuthData();
  notifyAuthChange(false, null);
  
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
  } else {
    notifyAuthChange(false, null);
  }
  
  return isAuth;
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
  if (isAuthenticated()) {
    window.location.href = redirectUrl;
    return false;
  }
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
  return urlParams.get('redirect') || defaultUrl;
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
  
  // Utilities
  getRedirectUrl,
  getUserDisplayName,
  getUserAvatar,
  authState
};
