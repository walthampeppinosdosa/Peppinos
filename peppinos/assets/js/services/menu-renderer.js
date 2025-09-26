/**
 * Menu Renderer
 * Handles dynamic rendering of menu items with category-based dropdown structure
 */

import { showToast } from '../ui.js';

/**
 * Menu Renderer Class
 */
export class MenuRenderer {
  constructor() {
    this.expandedCategories = new Set();
  }

  /**
   * Render organized menu items with dropdown structure
   * @param {Object} menuData - Organized menu data from MenuService
   * @param {HTMLElement} container - Container element to render into
   */
  renderOrganizedMenu(menuData, container) {
    try {
      if (!container) {
        throw new Error('Container element not found');
      }

      // Clear existing content
      container.innerHTML = '';

      const { organized } = menuData;

      // Check if container is a grid-list (for menu.html) or regular container
      const isGridList = container.classList.contains('grid-list') || container.tagName === 'UL';

      if (isGridList) {
        // For menu.html - render as simple grid list
        this.renderSimpleGridMenu(organized, container);
      } else {
        // For index.html or other pages - render with categories
        this.renderCategorizedMenu(organized, container);
      }

    } catch (error) {
      console.error('Error rendering menu:', error);
      container.innerHTML = '<li class="error-message">Failed to load menu items</li>';
    }
  }

  /**
   * Render simple grid menu for menu.html
   */
  renderSimpleGridMenu(organized, container) {
    let menuHTML = '';
    let modalsHTML = '';

    // Collect all items from all categories
    const allItems = [];

    // Add veg items
    if (organized.veg) {
      Object.values(organized.veg).forEach(categoryItems => {
        if (Array.isArray(categoryItems)) {
          allItems.push(...categoryItems.map(item => ({ ...item, isVegetarian: true })));
        }
      });
    }

    // Add non-veg items
    if (organized.nonVeg) {
      Object.values(organized.nonVeg).forEach(categoryItems => {
        if (Array.isArray(categoryItems)) {
          allItems.push(...categoryItems.map(item => ({ ...item, isVegetarian: false })));
        }
      });
    }

    // Render all items and their modals
    allItems.forEach(item => {
      menuHTML += this.renderMenuItem(item, item.isVegetarian);
      modalsHTML += this.createCartOptionsModal(item);
    });

    container.innerHTML = menuHTML;

    // Add modals to the body
    if (modalsHTML) {
      const modalsContainer = document.getElementById('cart-modals-container') || this.createModalsContainer();
      modalsContainer.innerHTML = modalsHTML;
    }
  }

  /**
   * Create or get modals container
   */
  createModalsContainer() {
    let container = document.getElementById('cart-modals-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cart-modals-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Render categorized menu with dropdowns
   */
  renderCategorizedMenu(organized, container) {
    const menuHTML = `
      <div class="menu-container">
        ${this.renderParentCategorySection('veg', organized.veg)}
        ${this.renderParentCategorySection('nonVeg', organized.nonVeg)}
      </div>
    `;

    container.innerHTML = menuHTML;

    // Add event listeners for dropdown functionality
    this.attachEventListeners(container);
  }

  /**
   * Render a parent category section (Veg or Non-Veg)
   * @param {string} type - 'veg' or 'nonVeg'
   * @param {Object} categoryData - Category data for this parent
   * @param {Object} parentInfo - Parent category information
   * @returns {string} HTML string
   */
  renderParentCategorySection(type, categoryData, parentInfo) {
    if (!parentInfo.parentCategory || Object.keys(categoryData).length === 0) {
      return '';
    }

    const isVeg = type === 'veg';
    const sectionClass = isVeg ? 'menu-section-veg' : 'menu-section-nonveg';
    const colorClass = isVeg ? 'veg-section' : 'nonveg-section';

    return `
      <div class="menu-parent-section ${sectionClass}" data-parent-type="${type}">
        <div class="parent-category-header ${colorClass}">
          <h3 class="parent-category-title">
            ${parentInfo.parentCategory.name} Menu
            <span class="category-count">(${this.getTotalItemsCount(categoryData)} items)</span>
          </h3>
          <p class="parent-category-description">${parentInfo.parentCategory.description || ''}</p>
        </div>
        
        <div class="menu-categories-container">
          ${Object.values(categoryData).map(categoryGroup => 
            this.renderMenuCategory(categoryGroup, isVeg)
          ).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render a menu category with dropdown functionality
   * @param {Object} categoryGroup - Category with its items
   * @param {boolean} isVeg - Whether this is a vegetarian category
   * @returns {string} HTML string
   */
  renderMenuCategory(categoryGroup, isVeg) {
    const { category, items } = categoryGroup;
    const categoryId = category._id;
    const isExpanded = this.expandedCategories.has(categoryId);
    const colorClass = isVeg ? 'veg-category' : 'nonveg-category';

    return `
      <div class="menu-category-section ${colorClass}" data-category-id="${categoryId}">
        <div class="category-header" data-toggle-category="${categoryId}">
          <h4 class="category-title">
            ${category.name}
            <span class="category-type">(${isVeg ? 'Veg' : 'Non-Veg'})</span>
            <span class="item-count">${items.length} items</span>
          </h4>
          <div class="dropdown-arrow ${isExpanded ? 'expanded' : ''}">
            <ion-icon name="chevron-down-outline"></ion-icon>
          </div>
        </div>
        
        <div class="category-items ${isExpanded ? 'expanded' : 'collapsed'}" data-category-items="${categoryId}">
          <div class="grid-list">
            ${items.map(item => this.renderMenuItem(item, isVeg)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a single menu item card
   * @param {Object} item - Menu item data
   * @param {boolean} isVeg - Whether this is a vegetarian item
   * @returns {string} HTML string
   */
  renderMenuItem(item, isVeg) {
    const cardColorClass = isVeg ? 'menu-card-veg' : 'menu-card-nonveg';

    // Use backend data structure: discountedPrice and mrp
    const currentPrice = item.discountedPrice || item.price;
    const originalPrice = item.mrp;
    const hasDiscount = originalPrice && originalPrice > currentPrice;

    // Match the exact price structure from the original HTML
    let priceHTML = `<span class="span title-2">$${currentPrice}</span>`;

    // Handle image - use first image from images array or placeholder
    let imageUrl = './assets/images/menu-1.png'; // Default fallback
    if (item.images && item.images.length > 0) {
      imageUrl = item.images[0].url;
    }

    // Handle badges - match original structure
    let badgeHTML = '';
    if (item.featured) {
      badgeHTML = '<span class="badge label-1">Featured</span>';
    } else if (item.totalSales > 50) {
      badgeHTML = '<span class="badge label-1">Popular</span>';
    } else if (item.averageRating >= 4.5) {
      badgeHTML = '<span class="badge label-1">Chef Special</span>';
    }

    return `
      <li>
        <div class="menu-card hover:card ${cardColorClass}" data-item-id="${item._id}">
          <figure class="card-banner img-holder" style="--width: 100; --height: 100;">
            <img src="${imageUrl}" width="100" height="100" loading="lazy" alt="${item.name}" class="img-cover">
          </figure>

          <div>
            <div class="title-wrapper">
              <h3 class="title-3">
                <span class="${isVeg ? 'veg-indicator' : 'nonveg-indicator'}" title="${isVeg ? 'Vegetarian' : 'Non-Vegetarian'}">●</span>
                <a href="#" class="card-title" data-item-id="${item._id}">${item.name}</a>
              </h3>

              ${badgeHTML}

              ${priceHTML}
            </div>

            <p class="card-text label-1">
              ${item.description || 'Delicious menu item prepared with authentic spices and fresh ingredients.'}
            </p>

            <div class="card-actions">
              <button class="btn btn-primary add-to-cart-btn"
                      data-item-id="${item._id}"
                      data-item-name="${item.name}"
                      data-item-price="${currentPrice}"
                      data-is-veg="${isVeg}">
                <ion-icon name="bag-add-outline"></ion-icon>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </li>
    `;
  }

  /**
   * Create cart options modal for menu item
   * @param {Object} item - Menu item data
   * @returns {string} Modal HTML string
   */
  createCartOptionsModal(item) {
    const hasOptions = this.hasCartOptions(item);

    if (!hasOptions) {
      return ''; // No modal needed if no options
    }

    return `
      <div class="cart-options-modal" id="cartModal-${item._id}" style="display: none;">
        <div class="modal-overlay" data-modal-close></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${item.name}</h3>
            <button class="modal-close-btn" data-modal-close>
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>

          <div class="modal-body">
            ${this.renderQuantitySelector()}
            ${this.renderSizeOptions(item.sizes)}
            ${this.renderSpicyLevelOptions(item.spicyLevel)}
            ${this.renderPreparationOptions(item.preparations)}
            ${this.renderSpecialInstructions(item.specialInstructions)}
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-modal-close>Cancel</button>
            <button class="btn btn-primary" id="confirmAddToCart-${item._id}">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Check if item has cart options that require user selection
   * @param {Object} item - Menu item data
   * @returns {boolean}
   */
  hasCartOptions(item) {
    return (
      (item.sizes && item.sizes.length > 0) ||
      (item.spicyLevel && item.spicyLevel.length > 0) ||
      (item.preparations && item.preparations.length > 0) ||
      item.specialInstructions
    );
  }

  /**
   * Render quantity selector
   * @returns {string} HTML string
   */
  renderQuantitySelector() {
    return `
      <div class="option-group">
        <label class="option-label">Quantity</label>
        <div class="quantity-selector">
          <button type="button" class="qty-btn" data-action="decrease">-</button>
          <input type="number" class="quantity-input" value="1" min="1" max="10">
          <button type="button" class="qty-btn" data-action="increase">+</button>
        </div>
      </div>
    `;
  }

  /**
   * Render size options
   * @param {Array} sizes - Available sizes
   * @returns {string} HTML string
   */
  renderSizeOptions(sizes) {
    if (!sizes || sizes.length === 0) return '';

    const sizeOptions = sizes.map(size => `
      <label class="radio-option">
        <input type="radio" name="size" value="${size.name}" data-price="${size.price}" ${size.isDefault ? 'checked' : ''}>
        <span class="radio-label">
          <span class="size-name">${size.name}</span>
          <span class="size-price">$${size.price}</span>
        </span>
      </label>
    `).join('');

    return `
      <div class="option-group">
        <label class="option-label">Size <span class="required">*</span></label>
        <div class="radio-group">
          ${sizeOptions}
        </div>
      </div>
    `;
  }

  /**
   * Render spicy level options
   * @param {Array} spicyLevels - Available spicy levels
   * @returns {string} HTML string
   */
  renderSpicyLevelOptions(spicyLevels) {
    if (!spicyLevels || spicyLevels.length === 0) return '';

    // Default spicy levels if none provided
    const defaultSpicyLevels = ['Mild', 'Medium', 'Spicy', 'Extra Spicy'];
    const levelsToUse = spicyLevels.length > 0 ? spicyLevels : defaultSpicyLevels;

    const spicyOptions = levelsToUse.map(level => `
      <label class="radio-option">
        <input type="radio" name="spicyLevel" value="${level}">
        <span class="radio-label">${level}</span>
      </label>
    `).join('');

    return `
      <div class="option-group">
        <label class="option-label">Spicy Level</label>
        <div class="radio-group">
          ${spicyOptions}
        </div>
      </div>
    `;
  }

  /**
   * Render preparation options
   * @param {Array} preparations - Available preparation options
   * @returns {string} HTML string
   */
  renderPreparationOptions(preparations) {
    if (!preparations || preparations.length === 0) return '';

    // Common preparation options for fallback
    const commonPreparations = [
      { id: 'gluten-free', name: 'Gluten Free' },
      { id: 'vegan', name: 'Vegan' },
      { id: 'no-cilantro', name: 'No Cilantro' },
      { id: 'extra-spicy', name: 'Extra Spicy' },
      { id: 'mild', name: 'Mild' }
    ];

    // Handle both populated and non-populated preparations
    const prepOptions = preparations.map((prep, index) => {
      let prepId, prepName;

      if (typeof prep === 'string') {
        // ObjectId string - use common preparations as fallback
        const commonPrep = commonPreparations[index] || { id: prep, name: 'Preparation Option' };
        prepId = prep;
        prepName = commonPrep.name;
      } else if (prep._id) {
        // Populated object
        prepId = prep._id;
        prepName = prep.name || 'Preparation Option';
      } else {
        // Simple string
        prepId = prep;
        prepName = prep;
      }

      return `
        <label class="checkbox-option">
          <input type="checkbox" name="preparations" value="${prepId}">
          <span class="checkbox-label">${prepName}</span>
        </label>
      `;
    }).join('');

    return `
      <div class="option-group">
        <label class="option-label">Preparation</label>
        <div class="checkbox-group">
          ${prepOptions}
        </div>
      </div>
    `;
  }

  /**
   * Render special instructions field
   * @param {string} defaultInstructions - Default special instructions
   * @returns {string} HTML string
   */
  renderSpecialInstructions(defaultInstructions = '') {
    return `
      <div class="option-group">
        <label class="option-label">Special Instructions</label>
        <textarea
          class="special-instructions-input"
          placeholder="Any special requests or dietary requirements..."
          rows="3">${defaultInstructions}</textarea>
      </div>
    `;
  }

  /**
   * Render item badges (featured, popular, etc.)
   * @param {Object} item - Menu item data
   * @returns {string} HTML string
   */
  renderItemBadges(item) {
    const badges = [];

    if (item.featured) {
      badges.push('<span class="badge label-1 featured-badge">Featured</span>');
    }

    if (item.totalReviews > 50 && item.averageRating >= 4.5) {
      badges.push('<span class="badge label-1 popular-badge">Popular</span>');
    }

    if (item.discountPercentage > 10) {
      badges.push(`<span class="badge label-1 discount-badge">${item.discountPercentage}% OFF</span>`);
    }

    return badges.join('');
  }

  /**
   * Render rating display
   * @param {Object} item - Menu item data
   * @returns {string} HTML string
   */
  renderRating(item) {
    if (!item.averageRating || item.totalReviews === 0) {
      return '';
    }

    const stars = Math.round(item.averageRating);
    const starHTML = Array.from({ length: 5 }, (_, i) => 
      `<ion-icon name="${i < stars ? 'star' : 'star-outline'}" class="star-icon"></ion-icon>`
    ).join('');

    return `
      <div class="rating-wrapper">
        <div class="stars">${starHTML}</div>
        <span class="rating-text">${item.averageRating.toFixed(1)} (${item.totalReviews} reviews)</span>
      </div>
    `;
  }

  /**
   * Get total items count for a parent category
   * @param {Object} categoryData - Category data
   * @returns {number} Total items count
   */
  getTotalItemsCount(categoryData) {
    return Object.values(categoryData).reduce((total, category) => total + category.items.length, 0);
  }

  /**
   * Attach event listeners for dropdown functionality
   * @param {HTMLElement} container - Menu container
   */
  attachEventListeners(container) {
    // Category dropdown toggles
    const categoryHeaders = container.querySelectorAll('[data-toggle-category]');
    categoryHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const categoryId = e.currentTarget.dataset.toggleCategory;
        this.toggleCategory(categoryId, container);
      });
    });

    // Menu item clicks
    const menuItems = container.querySelectorAll('[data-item-id]');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = e.currentTarget.dataset.itemId;
        this.handleItemClick(itemId);
      });
    });
  }

  /**
   * Toggle category expansion
   * @param {string} categoryId - Category ID to toggle
   * @param {HTMLElement} container - Menu container
   */
  toggleCategory(categoryId, container) {
    const categorySection = container.querySelector(`[data-category-id="${categoryId}"]`);
    const itemsContainer = container.querySelector(`[data-category-items="${categoryId}"]`);
    const arrow = categorySection.querySelector('.dropdown-arrow');

    // Close all other categories first
    this.collapseAllCategories(container);

    // Only expand if it wasn't already expanded
    if (!this.expandedCategories.has(categoryId)) {
      // Expand
      this.expandedCategories.add(categoryId);
      itemsContainer.classList.remove('collapsed');
      itemsContainer.classList.add('expanded');
      arrow.classList.add('expanded');
    }
  }

  /**
   * Collapse all categories
   * @param {HTMLElement} container - Menu container
   */
  collapseAllCategories(container) {
    // Clear all expanded categories
    this.expandedCategories.clear();

    // Collapse all category sections
    const allItemsContainers = container.querySelectorAll('[data-category-items]');
    const allArrows = container.querySelectorAll('.dropdown-arrow');

    allItemsContainers.forEach(itemsContainer => {
      itemsContainer.classList.remove('expanded');
      itemsContainer.classList.add('collapsed');
    });

    allArrows.forEach(arrow => {
      arrow.classList.remove('expanded');
    });
  }

  /**
   * Handle menu item click
   * @param {string} itemId - Menu item ID
   */
  handleItemClick(itemId) {
    // TODO: Implement item detail view or add to cart functionality
    console.log('Menu item clicked:', itemId);
    showToast('Item details coming soon!', 'info');
  }

  /**
   * Render loading state
   * @param {HTMLElement} container - Container element
   */
  renderLoading(container) {
    container.innerHTML = `
      <div class="menu-loading">
        <div class="loading-spinner"></div>
        <p>Loading delicious menu items...</p>
      </div>
    `;
  }

  /**
   * Render error state
   * @param {HTMLElement} container - Container element
   * @param {string} message - Error message
   */
  renderError(container, message = 'Failed to load menu') {
    container.innerHTML = `
      <div class="menu-error">
        <ion-icon name="alert-circle-outline" class="error-icon"></ion-icon>
        <h3>Oops! Something went wrong</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
      </div>
    `;
  }
}

// Export singleton instance
export const menuRenderer = new MenuRenderer();
export default menuRenderer;
