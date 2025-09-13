/**
 * Menu Service
 * Handles menu data fetching, transformation, and organization for the frontend
 */

import { menuAPI, categoriesAPI } from '../api.js';
import { showToast } from '../ui.js';

/**
 * Menu Service Class
 */
export class MenuService {
  constructor() {
    this.menuCache = new Map();
    this.categoriesCache = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all categories organized by parent category
   * @returns {Promise<Object>} Categories organized by veg/non-veg
   */
  async getOrganizedCategories() {
    try {
      if (this.categoriesCache && this.categoriesCache.timestamp > Date.now() - this.cacheExpiry) {
        return this.categoriesCache.data;
      }

      const response = await categoriesAPI.getAll();
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch categories');
      }

      const categories = response.data.categories || response.data;
      
      // Organize categories by parent category
      const organized = {
        veg: {
          parentCategory: null,
          menuCategories: []
        },
        nonVeg: {
          parentCategory: null,
          menuCategories: []
        }
      };

      // Separate parent and menu categories
      const parentCategories = categories.filter(cat => cat.type === 'parent');
      const menuCategories = categories.filter(cat => cat.type === 'menu');

      // Find veg and non-veg parent categories
      const vegParent = parentCategories.find(cat => cat.isVegetarian === true);
      const nonVegParent = parentCategories.find(cat => cat.isVegetarian === false);

      if (vegParent) {
        organized.veg.parentCategory = vegParent;
        organized.veg.menuCategories = menuCategories.filter(cat => 
          cat.parentCategory && cat.parentCategory.toString() === vegParent._id.toString()
        );
      }

      if (nonVegParent) {
        organized.nonVeg.parentCategory = nonVegParent;
        organized.nonVeg.menuCategories = menuCategories.filter(cat => 
          cat.parentCategory && cat.parentCategory.toString() === nonVegParent._id.toString()
        );
      }

      // Cache the result
      this.categoriesCache = {
        data: organized,
        timestamp: Date.now()
      };

      return organized;
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Failed to load categories', 'error');
      throw error;
    }
  }

  /**
   * Get all menu items organized by category and parent category
   * @param {Object} filters - Filtering options
   * @returns {Promise<Object>} Menu items organized by category
   */
  async getOrganizedMenuItems(filters = {}) {
    try {
      const cacheKey = JSON.stringify(filters);
      const cached = this.menuCache.get(cacheKey);
      
      if (cached && cached.timestamp > Date.now() - this.cacheExpiry) {
        return cached.data;
      }

      // Get categories first
      const categories = await this.getOrganizedCategories();
      
      // Fetch menu items
      const response = await menuAPI.getAll({
        limit: 100, // Get more items for complete menu
        ...filters
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch menu items');
      }

      const menuItems = response.data.menuItems;

      // Organize menu items by category
      const organized = {
        veg: {},
        nonVeg: {}
      };

      // Initialize category groups
      categories.veg.menuCategories.forEach(category => {
        organized.veg[category._id] = {
          category: category,
          items: []
        };
      });

      categories.nonVeg.menuCategories.forEach(category => {
        organized.nonVeg[category._id] = {
          category: category,
          items: []
        };
      });

      // Distribute menu items into categories
      menuItems.forEach(item => {
        const categoryId = item.category._id || item.category;
        
        if (item.isVegetarian && organized.veg[categoryId]) {
          organized.veg[categoryId].items.push(this.transformMenuItem(item));
        } else if (!item.isVegetarian && organized.nonVeg[categoryId]) {
          organized.nonVeg[categoryId].items.push(this.transformMenuItem(item));
        }
      });

      // Remove empty categories
      Object.keys(organized.veg).forEach(categoryId => {
        if (organized.veg[categoryId].items.length === 0) {
          delete organized.veg[categoryId];
        }
      });

      Object.keys(organized.nonVeg).forEach(categoryId => {
        if (organized.nonVeg[categoryId].items.length === 0) {
          delete organized.nonVeg[categoryId];
        }
      });

      const result = {
        organized,
        categories,
        totalItems: menuItems.length
      };

      // Cache the result
      this.menuCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error fetching menu items:', error);
      showToast('Failed to load menu items', 'error');
      throw error;
    }
  }

  /**
   * Transform menu item data for frontend display
   * @param {Object} item - Raw menu item from API
   * @returns {Object} Transformed menu item
   */
  transformMenuItem(item) {
    return {
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.discountedPrice,
      originalPrice: item.mrp,
      discountPercentage: item.discountPercentage || Math.round(((item.mrp - item.discountedPrice) / item.mrp) * 100),
      image: item.images && item.images.length > 0 ? item.images[0].url : null,
      imageAlt: item.name,
      isVegetarian: item.isVegetarian,
      category: item.category,
      featured: item.featured,
      averageRating: item.averageRating || 0,
      totalReviews: item.totalReviews || 0,
      isAvailable: item.isAvailable && item.isActive,
      preparationTime: item.preparationTime,
      spicyLevel: item.spicyLevel,
      preparations: item.preparations,
      sizes: item.sizes,
      addons: item.addons,
      tags: item.tags || []
    };
  }

  /**
   * Get a single menu item by ID
   * @param {string} itemId - Menu item ID
   * @returns {Promise<Object>} Menu item data
   */
  async getMenuItemById(itemId) {
    try {
      const response = await menuAPI.getById(itemId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch menu item');
      }

      return response.data.menuItem || response.data;
    } catch (error) {
      console.error('Error fetching menu item:', error);
      throw error;
    }
  }

  /**
   * Get featured menu items
   * @returns {Promise<Array>} Featured menu items
   */
  async getFeaturedItems() {
    try {
      const response = await menuAPI.getFeatured();

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch featured items');
      }

      return response.data.menuItems.map(item => this.transformMenuItem(item));
    } catch (error) {
      console.error('Error fetching featured items:', error);
      showToast('Failed to load featured items', 'error');
      throw error;
    }
  }

  /**
   * Search menu items
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Search results
   */
  async searchMenuItems(query, filters = {}) {
    try {
      const response = await menuAPI.search(query, filters);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to search menu items');
      }

      return {
        items: response.data.menuItems.map(item => this.transformMenuItem(item)),
        suggestions: response.data.suggestions || [],
        query: response.data.query
      };
    } catch (error) {
      console.error('Error searching menu items:', error);
      showToast('Failed to search menu items', 'error');
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.menuCache.clear();
    this.categoriesCache = null;
  }
}

// Export singleton instance
export const menuService = new MenuService();
export default menuService;
