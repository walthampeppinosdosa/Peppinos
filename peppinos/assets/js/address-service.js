/**
 * Address Service for Peppino's Dosa
 * Handles address CRUD operations
 */

import { getApiUrl } from './config.js';
import { getAuthToken } from './auth.js';

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const url = getApiUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get all user addresses
 * @returns {Promise<Array>} Array of address objects
 */
export const getAllAddresses = async () => {
  try {
    const response = await makeAuthenticatedRequest('/api/shop/addresses');
    return response.data.addresses || [];
  } catch (error) {
    console.error('Error fetching addresses:', error);
    throw error;
  }
};

/**
 * Get address by ID
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} Address object
 */
export const getAddressById = async (addressId) => {
  try {
    const response = await makeAuthenticatedRequest(`/api/shop/addresses/${addressId}`);
    return response.data.address;
  } catch (error) {
    console.error('Error fetching address:', error);
    throw error;
  }
};

/**
 * Create new address
 * @param {Object} addressData - Address data
 * @param {Object} userData - User data for name and phone
 * @returns {Promise<Object>} Created address object
 */
export const createAddress = async (addressData, userData = null) => {
  try {
    // Add user data if provided
    const finalAddressData = { ...addressData };
    if (userData) {
      finalAddressData.name = userData.name || userData.username || userData.displayName;
      finalAddressData.phoneNumber = userData.phone || userData.phoneNumber || userData.mobile;
    }

    const response = await makeAuthenticatedRequest('/api/shop/addresses', {
      method: 'POST',
      body: JSON.stringify(finalAddressData)
    });
    return response.data.address;
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
};

/**
 * Update address
 * @param {string} addressId - Address ID
 * @param {Object} addressData - Updated address data
 * @param {Object} userData - User data for name and phone
 * @returns {Promise<Object>} Updated address object
 */
export const updateAddress = async (addressId, addressData, userData = null) => {
  try {
    // Add user data if provided
    const finalAddressData = { ...addressData };
    if (userData) {
      finalAddressData.name = userData.name || userData.username || userData.displayName;
      finalAddressData.phoneNumber = userData.phone || userData.phoneNumber || userData.mobile;
    }

    const response = await makeAuthenticatedRequest(`/api/shop/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(finalAddressData)
    });
    return response.data.address;
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
};

/**
 * Delete address
 * @param {string} addressId - Address ID
 * @returns {Promise<void>}
 */
export const deleteAddress = async (addressId) => {
  try {
    await makeAuthenticatedRequest(`/api/shop/addresses/${addressId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
};

/**
 * Set address as default
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} Updated address object
 */
export const setDefaultAddress = async (addressId) => {
  try {
    const response = await makeAuthenticatedRequest(`/api/shop/addresses/${addressId}/default`, {
      method: 'PUT'
    });
    return response.data.address;
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
};

/**
 * Get default address
 * @returns {Promise<Object|null>} Default address object or null
 */
export const getDefaultAddress = async () => {
  try {
    const response = await makeAuthenticatedRequest('/api/shop/addresses/default');
    return response.data.address;
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }
    console.error('Error fetching default address:', error);
    throw error;
  }
};

/**
 * Validate address data
 * @param {Object} addressData - Address data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateAddressData = (addressData) => {
  const errors = {};

  if (!addressData.type || !['home', 'work', 'other'].includes(addressData.type)) {
    errors.type = 'Please select a valid address type';
  }

  if (!addressData.street || addressData.street.trim().length < 5) {
    errors.street = 'Street address must be at least 5 characters long';
  }

  if (!addressData.city || addressData.city.trim().length < 2) {
    errors.city = 'Please enter a valid city';
  }

  if (!addressData.state || addressData.state.trim().length < 2) {
    errors.state = 'Please select a valid state';
  }

  if (!addressData.pincode || !/^\d{5}(-\d{4})?$/.test(addressData.pincode)) {
    errors.pincode = 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Format address for display
 * @param {Object} address - Address object
 * @returns {string} Formatted address string
 */
export const formatAddressForDisplay = (address) => {
  if (!address) return '';
  
  const parts = [
    address.street,
    address.landmark && `Near ${address.landmark}`,
    `${address.city}, ${address.state} ${address.pincode}`
  ].filter(Boolean);
  
  return parts.join(', ');
};
