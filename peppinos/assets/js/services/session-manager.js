/**
 * Session Manager
 * Handles session persistence and synchronization across tabs
 */

class SessionManager {
  constructor() {
    this.sessionKey = 'peppinos_session';
    this.cartKey = 'peppinos_cart';
    this.listeners = [];
    this.init();
  }

  /**
   * Initialize session manager
   */
  init() {
    // Listen for storage changes (cross-tab synchronization)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Listen for beforeunload to save session
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  /**
   * Handle storage changes from other tabs
   */
  handleStorageChange(e) {
    if (e.key === this.cartKey) {
      // Cart was updated in another tab
      this.notifyListeners('cartUpdated', e.newValue ? JSON.parse(e.newValue) : null);
    } else if (e.key === this.sessionKey) {
      // Session was updated in another tab
      this.notifyListeners('sessionUpdated', e.newValue ? JSON.parse(e.newValue) : null);
    }
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (!document.hidden) {
      // Page became visible, check for updates
      this.syncSession();
    }
  }

  /**
   * Handle before page unload
   */
  handleBeforeUnload() {
    this.updateLastActivity();
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
   * Get session data
   */
  getSession() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.warn('Failed to get session data:', error);
      return null;
    }
  }

  /**
   * Save session data
   */
  saveSession(data) {
    try {
      const sessionData = {
        ...data,
        lastActivity: Date.now(),
        timestamp: Date.now()
      };
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.warn('Failed to save session data:', error);
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      this.saveSession(session);
    }
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const session = this.getSession();
    if (!session || !session.timestamp) {
      return true;
    }
    return Date.now() - session.timestamp > maxAge;
  }

  /**
   * Clear session
   */
  clearSession() {
    try {
      localStorage.removeItem(this.sessionKey);
      return true;
    } catch (error) {
      console.warn('Failed to clear session:', error);
      return false;
    }
  }

  /**
   * Sync session across tabs
   */
  syncSession() {
    const session = this.getSession();
    if (session) {
      this.notifyListeners('sessionSynced', session);
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get or create guest session
   */
  getOrCreateGuestSession() {
    let session = this.getSession();
    
    if (!session || this.isSessionExpired()) {
      // Create new session
      session = {
        id: this.generateSessionId(),
        type: 'guest',
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      this.saveSession(session);
    } else {
      // Update last activity
      this.updateLastActivity();
    }
    
    return session;
  }

  /**
   * Set authenticated session
   */
  setAuthenticatedSession(userId, userData = {}) {
    const session = {
      id: this.generateSessionId(),
      type: 'authenticated',
      userId: userId,
      userData: userData,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    return this.saveSession(session);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const session = this.getSession();
    return session && session.type === 'authenticated' && !this.isSessionExpired();
  }

  /**
   * Get user ID if authenticated
   */
  getUserId() {
    const session = this.getSession();
    return this.isAuthenticated() ? session.userId : null;
  }

  /**
   * Logout user
   */
  logout() {
    this.clearSession();
    this.notifyListeners('userLoggedOut', null);
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const session = this.getSession();
    if (!session) return null;

    const now = Date.now();
    const duration = now - session.createdAt;
    const inactive = now - session.lastActivity;

    return {
      id: session.id,
      type: session.type,
      duration: duration,
      inactive: inactive,
      isExpired: this.isSessionExpired(),
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity)
    };
  }

  /**
   * Clean up expired data
   */
  cleanup() {
    if (this.isSessionExpired()) {
      this.clearSession();
      // Also clear cart if session is expired
      try {
        localStorage.removeItem(this.cartKey);
      } catch (error) {
        console.warn('Failed to clear expired cart:', error);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(interval = 5 * 60 * 1000) { // 5 minutes default
    setInterval(() => {
      this.cleanup();
    }, interval);
  }
}

// Create and export singleton instance
export const sessionManager = new SessionManager();

// Make it globally accessible
window.sessionManager = sessionManager;

export default sessionManager;
