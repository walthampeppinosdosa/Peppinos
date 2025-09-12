/**
 * Menu Page Controller
 * Handles dynamic menu loading and display for menu.html and index.html
 */

import { menuService } from './services/menu-service.js';
import { menuRenderer } from './services/menu-renderer.js';
import { showToast } from './ui.js';

/**
 * Menu Controller Class
 */
class MenuController {
  constructor() {
    this.isLoading = false;
    this.currentFilters = {};
    this.menuContainer = null;
  }

  /**
   * Initialize the menu controller
   */
  async init() {
    try {
      // Find menu container
      this.menuContainer = document.querySelector('#dynamic-menu-container') ||
                          document.querySelector('.menu-container') ||
                          document.querySelector('.menu .grid-list') ||
                          document.querySelector('#menu .grid-list');

      if (!this.menuContainer) {
        console.warn('Menu container not found. Menu functionality will not be available.');
        return;
      }

      // Load and display menu
      await this.loadMenu();

      // Set up event listeners
      this.setupEventListeners();

      console.log('Menu controller initialized successfully');
    } catch (error) {
      console.error('Failed to initialize menu controller:', error);
      this.handleError(error);
    }
  }

  /**
   * Load and display menu items
   * @param {Object} filters - Filtering options
   */
  async loadMenu(filters = {}) {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.currentFilters = { ...filters };

      // Show loading state
      menuRenderer.renderLoading(this.menuContainer);

      // Fetch organized menu data
      const menuData = await menuService.getOrganizedMenuItems(filters);

      // Render the menu
      menuRenderer.renderOrganizedMenu(menuData, this.menuContainer);

      console.log('Menu loaded successfully:', menuData);

    } catch (error) {
      console.error('Failed to load menu:', error);
      this.handleError(error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load featured items for homepage
   */
  async loadFeaturedItems() {
    try {
      const featuredContainer = document.querySelector('.featured-menu-container') ||
                               document.querySelector('.menu .grid-list');

      if (!featuredContainer) {
        console.warn('Featured menu container not found');
        return;
      }

      // Show loading state
      menuRenderer.renderLoading(featuredContainer);

      // Fetch featured items
      const featuredItems = await menuService.getFeaturedItems();

      // Render featured items in simple grid format
      this.renderFeaturedItems(featuredItems, featuredContainer);

    } catch (error) {
      console.error('Failed to load featured items:', error);
      this.handleError(error, featuredContainer);
    }
  }

  /**
   * Render featured items in simple grid format (for homepage)
   * @param {Array} items - Featured menu items
   * @param {HTMLElement} container - Container element
   */
  renderFeaturedItems(items, container) {
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="no-items">No featured items available</p>';
      return;
    }

    const itemsHTML = items.slice(0, 6).map(item => {
      const isVeg = item.isVegetarian;
      const cardColorClass = isVeg ? 'menu-card-veg' : 'menu-card-nonveg';
      
      return `
        <li>
          <div class="menu-card hover:card ${cardColorClass}" data-item-id="${item.id}">
            <figure class="card-banner img-holder" style="--width: 100; --height: 100;">
              <img src="${item.image || './assets/images/default-menu.png'}" 
                   width="100" height="100" loading="lazy" alt="${item.imageAlt}"
                   class="img-cover">
            </figure>

            <div>
              <div class="title-wrapper">
                <h3 class="title-3">
                  <span class="${isVeg ? 'veg-indicator' : 'nonveg-indicator'}" title="${isVeg ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                  <a href="menu.html" class="card-title">${item.name}</a>
                </h3>

                ${item.featured ? '<span class="badge label-1">Featured</span>' : ''}
                
                <span class="span title-2">$${item.price}</span>
              </div>

              <p class="card-text label-1">${item.description}</p>
            </div>
          </div>
        </li>
      `;
    }).join('');

    container.innerHTML = itemsHTML;
  }

  /**
   * Search menu items
   * @param {string} query - Search query
   */
  async searchMenu(query) {
    if (!query.trim()) {
      await this.loadMenu();
      return;
    }

    try {
      this.isLoading = true;
      menuRenderer.renderLoading(this.menuContainer);

      const searchResults = await menuService.searchMenuItems(query);
      
      // Render search results
      this.renderSearchResults(searchResults);

    } catch (error) {
      console.error('Failed to search menu:', error);
      this.handleError(error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Render search results
   * @param {Object} searchResults - Search results from menu service
   */
  renderSearchResults(searchResults) {
    const { items, query } = searchResults;

    if (!items || items.length === 0) {
      this.menuContainer.innerHTML = `
        <div class="no-results">
          <h3>No results found for "${query}"</h3>
          <p>Try searching with different keywords or browse our menu categories.</p>
          <button class="btn btn-primary" onclick="menuController.loadMenu()">View All Menu</button>
        </div>
      `;
      return;
    }

    // Group search results by vegetarian status for color coding
    const vegItems = items.filter(item => item.isVegetarian);
    const nonVegItems = items.filter(item => !item.isVegetarian);

    const resultsHTML = `
      <div class="search-results">
        <div class="search-header">
          <h3>Search Results for "${query}" (${items.length} items found)</h3>
          <button class="btn btn-secondary" onclick="menuController.loadMenu()">View All Menu</button>
        </div>
        
        <div class="grid-list">
          ${[...vegItems, ...nonVegItems].map(item => 
            menuRenderer.renderMenuItem(item, item.isVegetarian)
          ).join('')}
        </div>
      </div>
    `;

    this.menuContainer.innerHTML = resultsHTML;
  }

  /**
   * Filter menu by category
   * @param {string} categoryId - Category ID to filter by
   */
  async filterByCategory(categoryId) {
    await this.loadMenu({ category: categoryId });
  }

  /**
   * Filter menu by vegetarian status
   * @param {boolean} isVegetarian - Vegetarian filter
   */
  async filterByVegetarian(isVegetarian) {
    await this.loadMenu({ isVegetarian: isVegetarian.toString() });
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    await this.loadMenu();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('#menu-search');
    const searchButton = document.querySelector('#menu-search-btn');

    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchMenu(e.target.value);
        }, 500); // Debounce search
      });
    }

    if (searchButton) {
      searchButton.addEventListener('click', () => {
        const query = searchInput ? searchInput.value : '';
        this.searchMenu(query);
      });
    }

    // Filter buttons
    const vegFilterBtn = document.querySelector('#filter-veg');
    const nonVegFilterBtn = document.querySelector('#filter-nonveg');
    const clearFilterBtn = document.querySelector('#clear-filters');

    if (vegFilterBtn) {
      vegFilterBtn.addEventListener('click', () => this.filterByVegetarian(true));
    }

    if (nonVegFilterBtn) {
      nonVegFilterBtn.addEventListener('click', () => this.filterByVegetarian(false));
    }

    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', () => this.clearFilters());
    }
  }

  /**
   * Handle errors
   * @param {Error} error - Error object
   * @param {HTMLElement} container - Container to show error in
   */
  handleError(error, container = null) {
    const targetContainer = container || this.menuContainer;
    
    if (targetContainer) {
      menuRenderer.renderError(targetContainer, error.message);
    } else {
      showToast('Failed to load menu. Please try again.', 'error');
    }
  }

  /**
   * Refresh menu data
   */
  async refresh() {
    menuService.clearCache();
    await this.loadMenu(this.currentFilters);
  }
}

// Create global instance
const menuController = new MenuController();

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    menuController.init();
  });
} else {
  menuController.init();
}

// Export for global access
window.menuController = menuController;
export default menuController;
