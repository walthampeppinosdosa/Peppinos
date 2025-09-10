/**
 * API Service Module
 * Centralized API communication for Peppino's Dosa frontend
 */

import { CONFIG, getApiUrl } from './config.js';
import { getAuthToken, removeAuthData, isTokenExpired } from './auth.js';

/**
 * HTTP Client Class
 * Handles all HTTP requests with authentication and error handling
 */
class HttpClient {
  constructor() {
    this.baseURL = CONFIG.API.BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Get headers with authentication token
   */
  getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    const token = getAuthToken();
    if (token && !isTokenExpired()) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        removeAuthData();
        window.location.href = '/login.html';
        throw new Error('Authentication required');
      }

      // Handle other errors
      const error = new Error(data.message || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Generic request method
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint);
    
    const config = {
      method: 'GET',
      headers: this.getHeaders(options.headers),
      ...options
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      if (CONFIG.DEV.ENABLE_LOGGING) {
        console.error('API Request Error:', error);
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint));
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.toString());
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
      ...options
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
      ...options
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data,
      ...options
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    });
  }
}

// Create HTTP client instance
const httpClient = new HttpClient();

// Authentication API functions
export const authAPI = {
  login: (credentials) => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.LOGIN, credentials),
  register: (userData) => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.REGISTER, userData),
  logout: () => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.LOGOUT),
  refreshToken: (refreshToken) => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.REFRESH, { refreshToken }),
  forgotPassword: (email) => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),
  resetPassword: (token, newPassword) => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword }),
  verifyEmail: (token) => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.VERIFY_EMAIL, { token }),
  resendVerification: (email) => httpClient.post(CONFIG.API.ENDPOINTS.AUTH.RESEND_VERIFICATION, { email })
};

// User API functions
export const userAPI = {
  getProfile: () => httpClient.get(CONFIG.API.ENDPOINTS.USER.PROFILE),
  updateProfile: (userData) => httpClient.put(CONFIG.API.ENDPOINTS.USER.UPDATE_PROFILE, userData),
  changePassword: (passwordData) => httpClient.post(CONFIG.API.ENDPOINTS.USER.CHANGE_PASSWORD, passwordData),
  deleteAccount: () => httpClient.delete(CONFIG.API.ENDPOINTS.USER.DELETE_ACCOUNT)
};

// Menu API functions
export const menuAPI = {
  getAll: (params = {}) => httpClient.get(CONFIG.API.ENDPOINTS.MENU.GET_ALL, params),
  getById: (id) => httpClient.get(`${CONFIG.API.ENDPOINTS.MENU.GET_BY_ID}/${id}`),
  getByCategory: (category, params = {}) => httpClient.get(`${CONFIG.API.ENDPOINTS.MENU.GET_BY_CATEGORY}/${category}`, params),
  search: (query, params = {}) => httpClient.get(CONFIG.API.ENDPOINTS.MENU.SEARCH, { q: query, ...params })
};

// Order API functions
export const orderAPI = {
  create: (orderData) => httpClient.post(CONFIG.API.ENDPOINTS.ORDER.CREATE, orderData),
  getUserOrders: (params = {}) => httpClient.get(CONFIG.API.ENDPOINTS.ORDER.GET_USER_ORDERS, params),
  getById: (id) => httpClient.get(`${CONFIG.API.ENDPOINTS.ORDER.GET_BY_ID}/${id}`),
  updateStatus: (id, status) => httpClient.patch(`${CONFIG.API.ENDPOINTS.ORDER.UPDATE_STATUS}/${id}`, { status }),
  cancel: (id) => httpClient.patch(`${CONFIG.API.ENDPOINTS.ORDER.CANCEL}/${id}/cancel`)
};

// Cart API functions
export const cartAPI = {
  get: () => httpClient.get(CONFIG.API.ENDPOINTS.CART.GET),
  addItem: (itemData) => httpClient.post(CONFIG.API.ENDPOINTS.CART.ADD_ITEM, itemData),
  updateItem: (itemId, quantity) => httpClient.put(`${CONFIG.API.ENDPOINTS.CART.UPDATE_ITEM}/${itemId}`, { quantity }),
  removeItem: (itemId) => httpClient.delete(`${CONFIG.API.ENDPOINTS.CART.REMOVE_ITEM}/${itemId}`),
  clear: () => httpClient.delete(CONFIG.API.ENDPOINTS.CART.CLEAR)
};

// Categories API functions
export const categoriesAPI = {
  getAll: () => httpClient.get(CONFIG.API.ENDPOINTS.CATEGORIES.GET_ALL),
  getById: (id) => httpClient.get(`${CONFIG.API.ENDPOINTS.CATEGORIES.GET_BY_ID}/${id}`)
};

// Export the HTTP client for custom requests
export { httpClient };

// Default export
export default {
  auth: authAPI,
  user: userAPI,
  menu: menuAPI,
  order: orderAPI,
  cart: cartAPI,
  categories: categoriesAPI,
  client: httpClient
};
