import axios from 'axios';

// Get India's country code (ISO2)
const INDIA_COUNTRY_CODE = 'US';

// RapidAPI configuration using environment variables
const RAPIDAPI_CONFIG = {
  headers: {
    'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY,
    'x-rapidapi-host': import.meta.env.VITE_RAPIDAPI_HOST,
  }
};

const RAPIDAPI_BASE_URL = import.meta.env.VITE_RAPIDAPI_BASE_URL;

// Cache for states and cities to reduce API calls
let statesCache = null;
const citiesCache = new Map();

/**
 * Get all states in India
 * @returns {Promise<Array>} Array of state objects with id and label
 */
export const getStatesList = async () => {
  try {
    // Return cached data if available
    if (statesCache) {
      return statesCache;
    }

    const response = await axios.get(
      `${RAPIDAPI_BASE_URL}/states`,
      {
        params: { country_code: INDIA_COUNTRY_CODE },
        ...RAPIDAPI_CONFIG
      }
    );

    const states = response.data.map(state => ({
      id: state.state_code,
      label: state.name,
      value: state.state_code,
      type: state.type
    })).sort((a, b) => a.label.localeCompare(b.label));

    // Cache the results
    statesCache = states;
    return states;
  } catch (error) {
    throw error;
  }
};

/**
 * Get cities by state ISO code
 * @param {string} stateCode - State ISO code (e.g., 'KA' for Karnataka)
 * @returns {Promise<Array>} Array of city objects with id and label
 */
export const getCitiesByState = async (stateCode) => {
  try {
    if (!stateCode) return [];

    // Check cache first
    if (citiesCache.has(stateCode)) {
      return citiesCache.get(stateCode);
    }

    // For city search, we'll use a search approach since the API requires a query
    // We'll return a function that can be called with a search term
    return [];
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

    const response = await axios.get(
      `${RAPIDAPI_BASE_URL}/cities/search`,
      {
        params: {
          q: cityQuery,
          country_code: INDIA_COUNTRY_CODE,
          state_code: stateCode
        },
        ...RAPIDAPI_CONFIG
      }
    );

    const cities = response.data.map(city => ({
      id: city.name,
      label: city.name,
      value: city.name,
      state_name: city.state_name
    })).sort((a, b) => a.label.localeCompare(b.label));

    return cities;
  } catch (error) {
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
    return false;
  }
};


