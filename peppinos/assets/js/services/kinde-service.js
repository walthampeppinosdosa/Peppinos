/**
 * Kinde Authentication Service (No SDK)
 * Implements OAuth 2.0 with PKCE for Single Page Applications
 * Based on: https://docs.kinde.com/developer-tools/about/using-kinde-without-an-sdk/
 */

import { CONFIG } from '../config.js';

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length = 128) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  
  return result;
}

/**
 * Generate SHA256 hash and base64url encode
 */
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(hash);
}

/**
 * Base64URL encode (without padding)
 */
function base64urlEncode(arrayBuffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Security utilities for Regular Web Application
 */
class SecurityHelper {
  static generateState() {
    return generateRandomString(32);
  }

  static generateNonce() {
    return generateRandomString(32);
  }
}

/**
 * Kinde OAuth 2.0 Service
 */
export class KindeService {
  constructor() {
    this.config = CONFIG.KINDE;
    this.storageKeys = {
      STATE: 'kinde_state',
      NONCE: 'kinde_nonce',
      ACCESS_TOKEN: 'kinde_access_token',
      ID_TOKEN: 'kinde_id_token',
      REFRESH_TOKEN: 'kinde_refresh_token',
      USER_DATA: 'kinde_user_data'
    };
  }

  /**
   * Initiate Google Sign-in flow
   */
  async initiateGoogleSignIn() {
    return this.initiateAuth('google', 'login');
  }

  /**
   * Initiate regular sign-in flow
   */
  async initiateSignIn() {
    return this.initiateAuth();
  }

  /**
   * Initiate sign-up flow
   */
  async initiateSignUp() {
    return this.initiateAuth('google', 'create');
  }

  /**
   * Initiate authentication flow (Regular Web Application - No PKCE)
   */
  async initiateAuth(connectionId = null, prompt = 'login') {
    try {

      // Validate configuration
      if (!this.config.CLIENT_ID) {
        throw new Error('Kinde Client ID is not configured');
      }
      if (!this.config.REDIRECT_URI) {
        throw new Error('Kinde Redirect URI is not configured');
      }
      if (!this.config.AUTH_URL) {
        throw new Error('Kinde Auth URL is not configured');
      }


      // Generate state and nonce for security (no PKCE for regular web apps)
      const state = SecurityHelper.generateState();
      const nonce = SecurityHelper.generateNonce();


      // Store parameters for later use
      sessionStorage.setItem(this.storageKeys.STATE, state);
      sessionStorage.setItem(this.storageKeys.NONCE, nonce);


      // Build authorization URL (Regular Web Application - Authorization Code Flow)
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: this.config.CLIENT_ID,
        redirect_uri: this.config.REDIRECT_URI,
        scope: this.config.SCOPE,
        state: state,
        nonce: nonce,
        prompt: prompt
      });

      // Add connection_id for Google sign-in
      if (connectionId) {
        authParams.append('connection_id', connectionId);
      }

      // Add prompt for create flow (use prompt instead of deprecated start_page)
      if (prompt === 'create') {
        console.log('📝 Using prompt: create for registration');
      }

      const authUrl = `${this.config.AUTH_URL}?${authParams.toString()}`;

     
      // Redirect to Kinde
      window.location.href = authUrl;

    } catch (error) {
      console.error('❌ Error initiating Kinde auth:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        config: this.config
      });
      throw new Error(`Failed to initiate authentication: ${error.message}`);
    }
  }

  /**
   * Handle the callback from Kinde (Regular Web Application)
   */
  async handleCallback() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

     

      // Check for errors
      if (error) {
        throw new Error(errorDescription || `Authentication error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received from Kinde');
      }

      // Verify state parameter
      const storedState = sessionStorage.getItem(this.storageKeys.STATE);
      if (!state || state !== storedState) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }


      // Exchange code for tokens via backend (since client secret is required)
      const result = await this.exchangeCodeViaBackend(code);

      // Store tokens
      this.storeTokens(result.tokens);

      // Store user data
      localStorage.setItem(this.storageKeys.USER_DATA, JSON.stringify(result.user));

      // Clean up session storage
      this.cleanupSessionStorage();

      return result;

    } catch (error) {
      console.error('Error handling Kinde callback:', error);
      this.cleanupSessionStorage();
      throw error;
    }
  }

  /**
   * Exchange authorization code via backend (Regular Web Application)
   * Backend handles client_secret securely
   */
  async exchangeCodeViaBackend(code) {

    try {
      // Import CONFIG for API base URL
      const { CONFIG } = await import('../config.js');

      const response = await fetch(`${CONFIG.API.BASE_URL}/api/auth/kinde-token-exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: this.config.REDIRECT_URI
        })
      });


      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Backend token exchange failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Backend token exchange failed: ${response.status} ${errorData}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Backend returned error:', result);
        throw new Error(result.message || 'Backend token exchange failed');
      }

      return {
        tokens: result.tokens,
        user: result.user
      };

    } catch (error) {
      console.error('❌ Error in backend token exchange:', error);
      throw error;
    }
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken) {
    const response = await fetch(this.config.USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Store tokens securely
   */
  storeTokens(tokens) {
    if (tokens.access_token) {
      localStorage.setItem(this.storageKeys.ACCESS_TOKEN, tokens.access_token);
    }
    if (tokens.id_token) {
      localStorage.setItem(this.storageKeys.ID_TOKEN, tokens.id_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem(this.storageKeys.REFRESH_TOKEN, tokens.refresh_token);
    }
  }

  /**
   * Get stored access token
   */
  getAccessToken() {
    return localStorage.getItem(this.storageKeys.ACCESS_TOKEN);
  }

  /**
   * Get stored user data
   */
  getUserData() {
    const userData = localStorage.getItem(this.storageKeys.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const accessToken = this.getAccessToken();
    const userData = this.getUserData();
    return !!(accessToken && userData);
  }

  /**
   * Logout user
   */
  logout() {
    // Clear all stored data
    Object.values(this.storageKeys).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Redirect to Kinde logout
    const logoutUrl = `${this.config.LOGOUT_URL}?redirect=${encodeURIComponent(this.config.LOGOUT_URI)}`;
    window.location.href = logoutUrl;
  }

  /**
   * Clean up session storage
   */
  cleanupSessionStorage() {
    sessionStorage.removeItem(this.storageKeys.STATE);
    sessionStorage.removeItem(this.storageKeys.NONCE);
  }
}

// Export singleton instance
export const kindeService = new KindeService();
