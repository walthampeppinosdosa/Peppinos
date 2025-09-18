/**
 * Configuration Management
 * Centralized configuration for the Peppino's Dosa frontend application
 * Version: 1.0.1 - Cache Bust
 */

// Environment Configuration
export const CONFIG = {
  // API Configuration
  API: {
    // BASE_URL: 'http://localhost:5000',
    BASE_URL: 'https://peppinos-backend.vercel.app',

    ENDPOINTS: {
      // Authentication endpoints
      AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        REFRESH: '/api/auth/refresh',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password',
        VERIFY_EMAIL: '/api/auth/verify-email',
        RESEND_VERIFICATION: '/api/auth/resend-verification'
      },
      // User endpoints
      USER: {
        PROFILE: '/api/user/profile',
        UPDATE_PROFILE: '/api/user/profile',
        CHANGE_PASSWORD: '/api/user/change-password',
        DELETE_ACCOUNT: '/api/user/delete-account'
      },
      // Menu endpoints (Shop)
      MENU: {
        GET_ALL: '/api/shop/menus',
        GET_BY_ID: '/api/shop/menus',
        GET_BY_CATEGORY: '/api/shop/menus',
        SEARCH: '/api/shop/menus/search',
        FEATURED: '/api/shop/menus/featured'
      },
      // Order endpoints
      ORDER: {
        CREATE: '/api/orders',
        GET_USER_ORDERS: '/api/orders/user',
        GET_BY_ID: '/api/orders',
        UPDATE_STATUS: '/api/orders',
        CANCEL: '/api/orders'
      },
      // Cart endpoints
      CART: {
        GET: '/api/cart',
        ADD_ITEM: '/api/cart/add',
        UPDATE_ITEM: '/api/cart/update',
        REMOVE_ITEM: '/api/cart/remove',
        CLEAR: '/api/cart/clear'
      },
      // Categories endpoints (Shop)
      CATEGORIES: {
        GET_ALL: '/api/shop/categories',
        GET_BY_ID: '/api/shop/categories'
      },
      // Address endpoints (Shop)
      ADDRESS: {
        GET_ALL: '/api/shop/addresses',
        GET_BY_ID: '/api/shop/addresses',
        CREATE: '/api/shop/addresses',
        UPDATE: '/api/shop/addresses',
        DELETE: '/api/shop/addresses',
        SET_DEFAULT: '/api/shop/addresses',
        GET_DEFAULT: '/api/shop/addresses/default'
      }
    }
  },

  // Authentication Configuration
  AUTH: {
    TOKEN_KEY: 'peppinos_auth_token',
    REFRESH_TOKEN_KEY: 'peppinos_refresh_token',
    USER_KEY: 'peppinos_user_data',
    TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes in milliseconds
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },

  // Kinde Auth Configuration (No SDK - Direct OAuth 2.0)
  KINDE: {
    DOMAIN: 'https://peppinos.kinde.com',
    CLIENT_ID: 'd69b5d0c9b724b04a47b2a29a410ac25',
    REDIRECT_URI: 'http://localhost:5500/peppinos/auth-callback.html',
    LOGOUT_URI: 'http://localhost:5500/peppinos',
    SCOPE: 'openid profile email',
    // OAuth 2.0 Endpoints
    AUTH_URL: 'https://peppinos.kinde.com/oauth2/auth',
    TOKEN_URL: 'https://peppinos.kinde.com/oauth2/token',
    LOGOUT_URL: 'https://peppinos.kinde.com/logout',
    USERINFO_URL: 'https://peppinos.kinde.com/oauth2/user_profile',
    JWKS_URL: 'https://peppinos.kinde.com/.well-known/jwks'
  },

  // Application Configuration
  APP: {
    NAME: "Peppino's Dosa",
    VERSION: '1.0.0',
    DESCRIPTION: 'Authentic Indian Cuisine Restaurant',
    CONTACT: {
      EMAIL: 'Walthampeppinosdosa@gmail.com',
      PHONE: '(781) 547-6099',
      ADDRESS: '434 Moody St, Waltham, MA 02453'
    }
  },

  // UI Configuration
  UI: {
    TOAST_DURATION: 5000, // 5 seconds
    LOADING_TIMEOUT: 30000, // 30 seconds
    DEBOUNCE_DELAY: 300, // 300ms
    ANIMATION_DURATION: 300, // 300ms
    PAGINATION: {
      DEFAULT_PAGE_SIZE: 12,
      MAX_PAGE_SIZE: 50
    }
  },

  // Validation Configuration
  VALIDATION: {
    PASSWORD: {
      MIN_LENGTH: 8,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true
    },
    EMAIL: {
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    PHONE: {
      PATTERN: /^\+?[\d\s\-\(\)]+$/
    }
  },

  // Location Services Configuration (RapidAPI)
  LOCATION: {
    RAPIDAPI_KEY: '79c1d61b05msh074c13a69af8475p1dd228jsn7e411b29dbbc',
    RAPIDAPI_HOST: 'city-and-state-search-api.p.rapidapi.com',
    RAPIDAPI_BASE_URL: 'https://city-and-state-search-api.p.rapidapi.com',
    ENDPOINTS: {
      STATES: '/states',
      CITIES: '/cities'
    }
  },

  // Feature Flags
  FEATURES: {
    GUEST_CHECKOUT: true,
    SOCIAL_LOGIN: true,
    EMAIL_VERIFICATION: true,
    TWO_FACTOR_AUTH: false,
    LOYALTY_PROGRAM: false,
    REVIEWS: true,
    NOTIFICATIONS: true
  },

  // Development Configuration
  DEV: {
    ENABLE_LOGGING: true,
    MOCK_API: false,
    DEBUG_MODE: true
  }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
  // Browser environment
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development environment - COMMENTED OUT TO USE PRODUCTION API
    // CONFIG.API.BASE_URL = 'http://localhost:5000';
    CONFIG.KINDE.REDIRECT_URI = 'http://localhost:5500/peppinos/auth-callback.html';
    CONFIG.KINDE.LOGOUT_URI = 'http://localhost:5500/peppinos';
    CONFIG.DEV.ENABLE_LOGGING = true;
    CONFIG.DEV.DEBUG_MODE = true;
  } else if (hostname.includes('staging')) {
    // Staging environment
    CONFIG.API.BASE_URL = 'https://staging-api.peppinosdosa.com';
    CONFIG.KINDE.REDIRECT_URI = 'https://staging.peppinosdosa.com/auth-callback.html';
    CONFIG.KINDE.LOGOUT_URI = 'https://staging.peppinosdosa.com';
    CONFIG.DEV.ENABLE_LOGGING = true;
    CONFIG.DEV.DEBUG_MODE = false;
  } else {
    // Production environment - use relative URLs for Firebase hosting rewrites
    CONFIG.API.BASE_URL = '';
    CONFIG.KINDE.REDIRECT_URI = 'https://walthampeppinos.web.app/auth-callback.html';
    CONFIG.KINDE.LOGOUT_URI = 'https://walthampeppinos.web.app';
    CONFIG.DEV.ENABLE_LOGGING = false;
    CONFIG.DEV.DEBUG_MODE = false;
  }
}

// Utility functions for configuration
export const getApiUrl = (endpoint) => {
  // Fallback to hardcoded URL if CONFIG is not available
  const baseUrl = CONFIG?.API?.BASE_URL || 'https://peppinos-backend.vercel.app';

  if (!baseUrl || baseUrl === 'undefined' || baseUrl === 'null') {
    console.error('🚨 CONFIG.API.BASE_URL is not properly defined:', {
      CONFIG_API: CONFIG?.API,
      BASE_URL: CONFIG?.API?.BASE_URL,
      endpoint: endpoint
    });
    // Use fallback URL
    const fallbackUrl = 'https://peppinos-backend.vercel.app';
    const fullUrl = `${fallbackUrl}${endpoint}`;
    console.warn('🔄 Using fallback API URL:', fullUrl);
    return fullUrl;
  }

  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('🔗 Constructing API URL:', { baseUrl, endpoint, fullUrl });
  return fullUrl;
};

export const isFeatureEnabled = (feature) => {
  return CONFIG.FEATURES[feature] || false;
};

export const getValidationRule = (type) => {
  return CONFIG.VALIDATION[type] || {};
};

// Export individual configurations for convenience
export const { API, AUTH, KINDE, APP, UI, VALIDATION, FEATURES, DEV, LOCATION } = CONFIG;

export default CONFIG;
