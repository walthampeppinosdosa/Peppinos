/**
 * Location Service for Peppino's Dosa
 * Handles state and city data fetching using RapidAPI
 * Adapted for HTML/JS environment without Vite
 */

import { LOCATION } from './config.js';

// Get US country code (as per the original implementation)
const COUNTRY_CODE = 'US';

// Cache for states and cities to reduce API calls
let statesCache = null;
const citiesCache = new Map();

/**
 * Make API request to RapidAPI
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response data
 */
const makeRapidAPIRequest = async (endpoint, params = {}) => {
  try {
    const url = new URL(endpoint, LOCATION.RAPIDAPI_BASE_URL);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': LOCATION.RAPIDAPI_KEY,
        'x-rapidapi-host': LOCATION.RAPIDAPI_HOST,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('RapidAPI request failed:', error);
    throw error;
  }
};

/**
 * Get all states in US
 * @returns {Promise<Array>} Array of state objects with id and label
 */
export const getStatesList = async () => {
  try {
    // Return cached data if available
    if (statesCache) {
      return statesCache;
    }

    const data = await makeRapidAPIRequest(LOCATION.ENDPOINTS.STATES, {
      country_code: COUNTRY_CODE
    });

    const states = data.map(state => ({
      id: state.state_code,
      label: state.name,
      value: state.state_code,
      type: state.type
    })).sort((a, b) => a.label.localeCompare(b.label));

    // Cache the results
    statesCache = states;
    return states;
  } catch (error) {
    console.error('Error fetching states:', error);
    throw error;
  }
};

/**
 * Get cities by state ISO code
 * @param {string} stateCode - State ISO code (e.g., 'CA' for California)
 * @returns {Promise<Array>} Array of city objects with id and label
 */
export const getCitiesByState = async (stateCode) => {
  try {
    if (!stateCode) return [];

    // Check cache first
    if (citiesCache.has(stateCode)) {
      return citiesCache.get(stateCode);
    }

    // Get cities for the state using the cities endpoint
    const data = await makeRapidAPIRequest(LOCATION.ENDPOINTS.CITIES, {
      country_code: COUNTRY_CODE,
      state_code: stateCode
    });

    const cities = data.map(city => ({
      id: city.name,
      label: city.name,
      value: city.name,
      state_name: city.state_name
    })).sort((a, b) => a.label.localeCompare(b.label));

    // Cache the results
    citiesCache.set(stateCode, cities);
    return cities;
  } catch (error) {
    console.error('Error fetching cities for state:', stateCode, error);
    return [];
  }
};

/**
 * Search cities by name and state
 * @param {string} cityQuery - City name to search for
 * @param {string} stateCode - State ISO code
 * @returns {Promise<Array>} Array of matching city objects
 */
export const searchCitiesByState = async (cityQuery, stateCode) => {
  try {
    if (!cityQuery || !stateCode) return [];

    const data = await makeRapidAPIRequest('/cities/search', {
      q: cityQuery,
      country_code: COUNTRY_CODE,
      state_code: stateCode
    });

    const cities = data.map(city => ({
      id: city.name,
      label: city.name,
      value: city.name,
      state_name: city.state_name
    })).sort((a, b) => a.label.localeCompare(b.label));

    // Cache the results for this state
    if (!citiesCache.has(stateCode)) {
      citiesCache.set(stateCode, []);
    }
    
    // Add new cities to cache (avoid duplicates)
    const existingCities = citiesCache.get(stateCode);
    cities.forEach(city => {
      if (!existingCities.find(existing => existing.value === city.value)) {
        existingCities.push(city);
      }
    });

    return cities;
  } catch (error) {
    console.error('Error searching cities:', error);
    throw error;
  }
};

/**
 * Get state name by ISO code
 * @param {string} stateCode - State ISO code
 * @returns {Promise<string>} State name
 */
export const getStateNameByCode = async (stateCode) => {
  try {
    if (!stateCode) return '';

    const states = await getStatesList();
    const state = states.find(s => s.value === stateCode || s.id === stateCode);
    return state ? state.label : stateCode;
  } catch (error) {
    console.error('Error getting state name:', error);
    return stateCode;
  }
};

/**
 * Get state code by name
 * @param {string} stateName - State name
 * @returns {Promise<string>} State ISO code
 */
export const getStateCodeByName = async (stateName) => {
  try {
    if (!stateName) return '';

    const states = await getStatesList();
    const state = states.find(s => s.label === stateName);
    return state ? state.value : stateName;
  } catch (error) {
    console.error('Error getting state code:', error);
    return stateName;
  }
};

/**
 * Validate if a city exists in the given state
 * @param {string} cityName - City name
 * @param {string} stateCode - State ISO code
 * @returns {Promise<boolean>} True if city exists in state
 */
export const validateCityInState = async (cityName, stateCode) => {
  try {
    if (!cityName || !stateCode) return false;

    const cities = await searchCitiesByState(cityName, stateCode);
    return cities.some(city => city.label.toLowerCase() === cityName.toLowerCase());
  } catch (error) {
    console.error('Error validating city:', error);
    return false;
  }
};

/**
 * Get popular cities for a state (cached cities)
 * @param {string} stateCode - State ISO code
 * @returns {Array} Array of cached city objects
 */
export const getPopularCitiesForState = (stateCode) => {
  if (!stateCode) return [];
  return citiesCache.get(stateCode) || [];
};

/**
 * Clear location cache
 */
export const clearLocationCache = () => {
  statesCache = null;
  citiesCache.clear();
};
