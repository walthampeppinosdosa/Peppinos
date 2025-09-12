/**
 * Featured Menu Loader for Index Page
 * Loads featured menu items dynamically while preserving existing styles
 */

import { menuAPI } from './api.js';

class FeaturedMenuLoader {
  constructor() {
    this.container = null;
  }

  /**
   * Initialize featured menu loading
   */
  async init() {
    this.container = document.getElementById('featured-menu-container');
    
    if (!this.container) {
      console.warn('Featured menu container not found');
      return;
    }

    try {
      await this.loadFeaturedItems();
    } catch (error) {
      console.error('Failed to load featured menu:', error);
      this.showError();
    }
  }

  /**
   * Load featured menu items from API
   */
  async loadFeaturedItems() {
    try {
      // Get menu items (limit to 6 for homepage)
      const response = await menuAPI.getAll({ limit: 6, featured: true });
      
      if (!response.success) {
        throw new Error(response.message);
      }

      const menuItems = response.data.menuItems;
      
      if (menuItems.length === 0) {
        // If no featured items, get regular items
        const regularResponse = await menuAPI.getAll({ limit: 6 });
        if (regularResponse.success) {
          this.renderMenuItems(regularResponse.data.menuItems);
        } else {
          this.showError();
        }
      } else {
        this.renderMenuItems(menuItems);
      }

    } catch (error) {
      console.error('Error loading featured items:', error);
      this.showError();
    }
  }

  /**
   * Render menu items in the existing HTML structure
   */
  renderMenuItems(items) {
    const menuHTML = items.map(item => this.renderMenuItem(item)).join('');
    this.container.innerHTML = menuHTML;
  }

  /**
   * Render a single menu item matching the EXACT existing HTML structure
   */
  renderMenuItem(item) {
    const isVeg = item.isVegetarian;
    const cardClass = isVeg ? 'menu-card-veg' : 'menu-card-nonveg';
    const indicator = isVeg ? '🌱' : '🍖';

    // Use first image or fallback
    let imageUrl = './assets/images/menu-1.png';
    if (item.images && item.images.length > 0) {
      imageUrl = item.images[0].url;
    }

    // Handle pricing
    const currentPrice = item.discountedPrice || item.price;

    // Handle badges
    let badgeHTML = '';
    if (item.featured) {
      badgeHTML = '<span class="badge label-1">Featured</span>';
    } else if (item.totalSales > 50) {
      badgeHTML = '<span class="badge label-1">Popular</span>';
    } else if (item.averageRating >= 4.5) {
      badgeHTML = '<span class="badge label-1">Chef Special</span>';
    }

    // Return EXACT same HTML structure as original index.html
    return `
            <li>
              <div class="menu-card hover:card ${cardClass}">

                <figure class="card-banner img-holder" style="--width: 100; --height: 100;">
                  <img src="${imageUrl}" width="100" height="100" loading="lazy" alt="${item.name}"
                    class="img-cover">
                </figure>

                <div>

                  <div class="title-wrapper">
                    <h3 class="title-3">
                      <span style="margin-right: 8px;">${indicator}</span>
                      <a href="menu.html" class="card-title">${item.name}</a>
                    </h3>

                    ${badgeHTML}

                    <span class="span title-2">$${currentPrice}</span>
                  </div>

                  <p class="card-text label-1">
                    ${item.description || 'Delicious menu item prepared with authentic spices and fresh ingredients.'}
                  </p>

                </div>

              </div>
            </li>
    `;
  }

  /**
   * Show error state
   */
  showError() {
    this.container.innerHTML = `
      <li>
        <div class="menu-card">
          <div style="text-align: center; padding: 40px;">
            <h3>Unable to load menu items</h3>
            <p>Please try refreshing the page</p>
          </div>
        </div>
      </li>
    `;
  }
}

// Create and export instance
export const featuredMenuLoader = new FeaturedMenuLoader();

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    featuredMenuLoader.init();
  });
} else {
  featuredMenuLoader.init();
}
