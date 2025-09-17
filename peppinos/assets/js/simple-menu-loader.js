/**
 * Category-Based Menu Loader
 * Loads menu items organized by categories with dropdown structure
 */

import { menuAPI, categoriesAPI } from './api.js';

class CategoryMenuLoader {
  constructor() {
    this.container = null;
    this.menuData = null;
    this.categoriesData = null;
  }

  /**
   * Initialize menu loading
   */
  async init() {
    // Find container
    this.container = document.querySelector('#dynamic-menu-container') ||
                    document.querySelector('.grid-list');

    if (!this.container) {
      console.warn('Menu container not found');
      return;
    }

    try {
      await this.loadMenuData();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to load menu:', error);
      this.showError();
    }
  }

  /**
   * Load menu data and categories
   */
  async loadMenuData() {
    try {
      this.showLoading();

      // Load menu items and categories (including hierarchical structure)
      const [menuResponse, categoriesResponse] = await Promise.all([
        menuAPI.getAll({ limit: 100 }),
        categoriesAPI.getAll({ hierarchical: false })
      ]);

      if (!menuResponse.success || !categoriesResponse.success) {
        throw new Error('Failed to load menu data');
      }

      this.menuData = menuResponse.data.menuItems;
      this.categoriesData = categoriesResponse.data.categories;

      this.renderCategorizedMenu();

    } catch (error) {
      console.error('Error loading menu data:', error);
      this.showError();
    }
  }

  /**
   * Render categorized menu with dropdown structure
   */
  renderCategorizedMenu() {
    if (!this.menuData || !this.categoriesData) {
      this.showError();
      return;
    }

    // Organize data by parent categories
    const organized = this.organizeMenuByCategories();

    // Check if this is a grid-list container (index.html) or category container (menu.html)
    const isGridList = this.container.classList.contains('grid-list') || this.container.tagName === 'UL';

    if (isGridList) {
      this.renderSimpleGrid(organized);
    } else {
      this.renderCategoryDropdowns(organized);
    }
  }

  /**
   * Organize menu items by categories
   */
  organizeMenuByCategories() {
    const parentCategories = this.categoriesData.filter(cat => cat.type === 'parent');
    const menuCategories = this.categoriesData.filter(cat => cat.type === 'menu');

    const organized = {};

    // Initialize both veg and nonveg sections
    organized.veg = { parent: null, categories: {} };
    organized.nonveg = { parent: null, categories: {} };

    parentCategories.forEach(parent => {
      const parentType = parent.isVegetarian ? 'veg' : 'nonveg';
      organized[parentType].parent = parent;

      // Find menu categories for this parent
      const childCategories = menuCategories.filter(cat =>
        cat.parentCategory === parent._id
      );

      childCategories.forEach(category => {
        const categoryItems = this.menuData.filter(item =>
          item.category && item.category._id === category._id
        );

        if (categoryItems.length > 0) {
          organized[parentType].categories[category.name] = {
            category: category,
            items: categoryItems
          };
        }
      });
    });

    // Always organize items by their isVegetarian property as fallback
    // This ensures both veg and non-veg sections are populated
    const vegCategories = {};
    const nonvegCategories = {};

    menuCategories.forEach(category => {
      const categoryItems = this.menuData.filter(item =>
        item.category && item.category._id === category._id
      );

      if (categoryItems.length > 0) {
        // Split items by vegetarian status
        const vegItems = categoryItems.filter(item => item.isVegetarian);
        const nonvegItems = categoryItems.filter(item => !item.isVegetarian);

        if (vegItems.length > 0) {
          vegCategories[category.name] = { category, items: vegItems };
        }
        if (nonvegItems.length > 0) {
          nonvegCategories[category.name] = { category, items: nonvegItems };
        }
      }
    });

    // Merge with parent category organization or use as fallback
    if (Object.keys(organized.veg.categories).length === 0) {
      organized.veg.categories = vegCategories;
    }
    if (Object.keys(organized.nonveg.categories).length === 0) {
      organized.nonveg.categories = nonvegCategories;
    }

    return organized;
  }

  /**
   * Render category dropdowns for menu.html in two-column layout
   */
  renderCategoryDropdowns(organized) {
    let menuHTML = `
      <div class="menu-categories-wrapper">
        <div class="two-column-layout">
          <div class="veg-column">
    `;

    // Render Vegetarian section
    if (organized.veg && Object.keys(organized.veg.categories).length > 0) {
      menuHTML += this.renderParentSection('Vegetarian', organized.veg, true);
    }

    menuHTML += `
          </div>
          <div class="nonveg-column">
    `;

    // Render Non-Vegetarian section
    if (organized.nonveg && Object.keys(organized.nonveg.categories).length > 0) {
      menuHTML += this.renderParentSection('Non-Vegetarian', organized.nonveg, false);
    }

    menuHTML += `
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = menuHTML;
    this.setupDropdownInteractions();
    this.setupCartInteractions();
  }

  /**
   * Render simple grid for index.html (featured items)
   */
  renderSimpleGrid(organized) {
    const allItems = [];

    // Collect all items
    Object.values(organized).forEach(parentData => {
      Object.values(parentData.categories).forEach(categoryData => {
        allItems.push(...categoryData.items);
      });
    });

    // Limit to 6 items for homepage
    const featuredItems = allItems.slice(0, 6);
    const menuHTML = featuredItems.map(item => this.renderMenuItem(item)).join('');
    this.container.innerHTML = menuHTML;
    this.setupCartInteractions();
  }

  /**
   * Render parent section (Veg/Non-Veg)
   */
  renderParentSection(title, parentData, isVeg) {
    const sectionClass = isVeg ? 'veg-section' : 'nonveg-section';
    const categories = parentData.categories;

    let sectionHTML = `
      <div class="category-section ${sectionClass}">
        <div class="section-header">
          <h2 class="section-title">${title} Menu</h2>
        </div>
        <div class="categories-list">
    `;

    // Render each category as dropdown
    Object.entries(categories).forEach(([categoryName, categoryData]) => {
      sectionHTML += this.renderCategoryDropdown(categoryName, categoryData, isVeg);
    });

    sectionHTML += '</div></div>';
    return sectionHTML;
  }

  /**
   * Render category dropdown
   */
  renderCategoryDropdown(categoryName, categoryData, isVeg) {
    const { items } = categoryData;
    // Make dropdown ID unique for veg/non-veg sections
    const vegPrefix = isVeg ? 'veg' : 'nonveg';
    const dropdownId = `dropdown-${vegPrefix}-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
    const vegLabel = isVeg ? 'Veg' : 'Non-Veg';

    let dropdownHTML = `
      <div class="category-dropdown">
        <div class="dropdown-header" data-dropdown="${dropdownId}">
          <h3 class="category-title">${categoryName} (${vegLabel}) ▲</h3>
          <span class="item-count">${items.length} items</span>
        </div>
        <ul class="dropdown-content grid-list" id="${dropdownId}" style="display: block;">
    `;

    // Render items in this category
    items.forEach(item => {
      dropdownHTML += this.renderMenuItem(item);
    });

    dropdownHTML += `
        </ul>
      </div>
    `;

    return dropdownHTML;
  }

  /**
   * Render single menu item matching EXACT existing HTML structure
   */
  renderMenuItem(item) {
    const isVeg = item.isVegetarian;
    const cardClass = isVeg ? 'menu-card-veg' : 'menu-card-nonveg';
    const indicator = isVeg ? '🌱' : '🍖';

    // Handle image - use exact same structure as original
    let imageUrl = './assets/images/menu-1.png';
    if (item.images && item.images.length > 0) {
      imageUrl = item.images[0].url;
    }

    // Handle pricing - exact same structure
    const currentPrice = item.discountedPrice || item.price;

    // Handle badges - exact same structure
    let badgeHTML = '';
    if (item.featured) {
      badgeHTML = '<span class="badge label-1">Featured</span>';
    } else if (item.totalSales > 50) {
      badgeHTML = '<span class="badge label-1">Popular</span>';
    } else if (item.averageRating >= 4.5) {
      badgeHTML = '<span class="badge label-1">Chef Special</span>';
    }

    // Return EXACT same HTML structure as original static menu
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
                      <a href="#" class="card-title">${item.name}</a>
                    </h3>

                    ${badgeHTML}

                    <span class="span title-2">$${currentPrice}</span>
                  </div>

                  <p class="card-text label-1">
                    ${item.description || 'Delicious menu item prepared with authentic spices and fresh ingredients.'}
                  </p>

                  <div class="menu-item-actions">
                    <div class="quantity-selector">
                      <button class="qty-btn qty-decrease" data-menu-id="${item._id}">-</button>
                      <span class="qty-display" data-menu-id="${item._id}">1</span>
                      <button class="qty-btn qty-increase" data-menu-id="${item._id}">+</button>
                    </div>

                    <button class="btn-add-to-cart" data-menu-id="${item._id}" data-menu-name="${item.name}" data-menu-price="${currentPrice}">
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
   * Setup dropdown interactions
   */
  setupDropdownInteractions() {
    const dropdownHeaders = this.container.querySelectorAll('.dropdown-header');

    dropdownHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const dropdownId = header.getAttribute('data-dropdown');
        const content = document.getElementById(dropdownId);
        const isVisible = content.style.display !== 'none';

        // Toggle visibility
        content.style.display = isVisible ? 'none' : 'block';

        // Update arrow
        const title = header.querySelector('.category-title');
        title.textContent = title.textContent.replace(/[▼▲]/, isVisible ? '▼' : '▲');
      });
    });
  }

  /**
   * Setup cart interactions (quantity selectors and add to cart buttons)
   */
  setupCartInteractions() {
    // Quantity increase buttons
    this.container.querySelectorAll('.qty-increase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const menuId = e.target.dataset.menuId;
        const qtyDisplay = this.container.querySelector(`.qty-display[data-menu-id="${menuId}"]`);
        let currentQty = parseInt(qtyDisplay.textContent);
        if (currentQty < 10) { // Max quantity limit
          qtyDisplay.textContent = currentQty + 1;
        }
      });
    });

    // Quantity decrease buttons
    this.container.querySelectorAll('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const menuId = e.target.dataset.menuId;
        const qtyDisplay = this.container.querySelector(`.qty-display[data-menu-id="${menuId}"]`);
        let currentQty = parseInt(qtyDisplay.textContent);
        if (currentQty > 1) { // Min quantity limit
          qtyDisplay.textContent = currentQty - 1;
        }
      });
    });

    // Add to cart buttons
    this.container.querySelectorAll('.btn-add-to-cart').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const menuId = button.dataset.menuId;
        const menuName = button.dataset.menuName;
        const menuPrice = parseFloat(button.dataset.menuPrice);
        const qtyDisplay = this.container.querySelector(`.qty-display[data-menu-id="${menuId}"]`);
        const quantity = parseInt(qtyDisplay.textContent);

        try {
          // Disable button during request
          button.disabled = true;
          button.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Adding...';

          // Import cart options service dynamically
          const { CartOptionsService } = await import('./services/cart-options-service.js');

          // Create cart options service instance if not exists
          if (!window.cartOptionsService) {
            window.cartOptionsService = new CartOptionsService();
          }

          // Set up button data for cart options service
          button.dataset.itemId = menuId;
          button.dataset.itemName = menuName;
          button.dataset.itemPrice = menuPrice;
          button.dataset.isVeg = this.menuData.find(item => item._id === menuId)?.isVegetarian || 'true';
          button.dataset.quantity = quantity; // Pass the quantity from UI

          // Handle add to cart with options checking
          await window.cartOptionsService.handleAddToCartClick(button, quantity);

          // Reset button state (success feedback is handled by cart service)
          button.disabled = false;
          button.innerHTML = '<ion-icon name="bag-add-outline"></ion-icon> Add to Cart';
          button.style.background = 'var(--gold-crayola)';
          // Reset quantity to 1
          qtyDisplay.textContent = '1';

        } catch (error) {
          console.error('Error adding to cart:', error);

          // Show error feedback
          button.innerHTML = '<ion-icon name="close-outline"></ion-icon> Error';
          button.style.background = 'var(--red-orange-crayola)';

          // Reset button after 2 seconds
          setTimeout(() => {
            button.disabled = false;
            button.innerHTML = '<ion-icon name="bag-add-outline"></ion-icon> Add to Cart';
            button.style.background = 'var(--gold-crayola)';
          }, 2000);
        }
      });
    });
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <li class="menu-loading">
        <div style="text-align: center; padding: 40px; color: var(--eerie-black-3);">
          <div style="font-size: 24px; margin-bottom: 10px;">🍽️</div>
          <p>Loading delicious menu items...</p>
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
        <div class="menu-card" style="text-align: center; padding: 40px;">
          <h3 style="color: #ef4444;">Unable to load menu</h3>
          <p>Please try refreshing the page</p>
          <button onclick="location.reload()" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin-top: 10px; cursor: pointer;">
            Try Again
          </button>
        </div>
      </li>
    `;
  }

  /**
   * Setup event listeners for search and filters
   */
  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchMenu(e.target.value);
        }, 500);
      });
    }

    // Filter buttons
    const vegFilter = document.getElementById('filter-veg');
    const nonVegFilter = document.getElementById('filter-nonveg');
    const clearFilter = document.getElementById('clear-filters');

    if (vegFilter) {
      vegFilter.addEventListener('click', () => {
        this.filterByVegetarian(true);
      });
    }

    if (nonVegFilter) {
      nonVegFilter.addEventListener('click', () => {
        this.filterByVegetarian(false);
      });
    }

    if (clearFilter) {
      clearFilter.addEventListener('click', () => {
        this.loadMenuData();
        if (searchInput) searchInput.value = '';
      });
    }
  }

  /**
   * Filter menu by vegetarian/non-vegetarian
   */
  filterByVegetarian(isVegetarian) {
    if (!this.menuData) return;

    const filteredItems = this.menuData.filter(item => item.isVegetarian === isVegetarian);
    const filterLabel = isVegetarian ? 'Vegetarian' : 'Non-Vegetarian';

    let filterHTML = `
      <div class="filter-results">
        <div class="filter-header" style="text-align: center; margin-bottom: 30px;">
          <h3>${filterLabel} Menu Items (${filteredItems.length} items)</h3>
          <button onclick="categoryMenuLoader.loadMenuData();"
                  style="background: var(--quick-silver); color: var(--white); padding: 8px 16px; border: none; border-radius: 4px; margin-top: 10px; cursor: pointer;">
            View All Menu
          </button>
        </div>
        <ul class="grid-list">
    `;

    filteredItems.forEach(item => {
      filterHTML += this.renderMenuItem(item);
    });

    filterHTML += '</ul></div>';
    this.container.innerHTML = filterHTML;
    this.setupCartInteractions();
  }

  /**
   * Search menu items
   */
  async searchMenu(query) {
    if (!query.trim()) {
      await this.loadMenuData();
      return;
    }

    try {
      this.showLoading();

      // Filter existing menu data by search query
      const filteredItems = this.menuData.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      );

      this.renderSearchResults(filteredItems, query);

    } catch (error) {
      console.error('Search error:', error);
      this.showError();
    }
  }

  /**
   * Render search results
   */
  renderSearchResults(items, query) {
    if (items.length === 0) {
      this.container.innerHTML = `
        <div class="search-results">
          <div style="text-align: center; padding: 40px;">
            <h3>No results found for "${query}"</h3>
            <p>Try searching with different keywords</p>
            <button onclick="document.getElementById('menu-search').value=''; categoryMenuLoader.loadMenuData();"
                    style="background: var(--gold-crayola); color: var(--eerie-black-1); padding: 10px 20px; border: none; border-radius: 4px; margin-top: 10px; cursor: pointer;">
              View All Menu
            </button>
          </div>
        </div>
      `;
      return;
    }

    let resultsHTML = `
      <div class="search-results">
        <div class="search-header" style="text-align: center; margin-bottom: 30px;">
          <h3>Search Results for "${query}" (${items.length} items found)</h3>
          <button onclick="document.getElementById('menu-search').value=''; categoryMenuLoader.loadMenuData();"
                  style="background: var(--quick-silver); color: var(--white); padding: 8px 16px; border: none; border-radius: 4px; margin-top: 10px; cursor: pointer;">
            View All Menu
          </button>
        </div>
        <ul class="grid-list">
    `;

    items.forEach(item => {
      resultsHTML += this.renderMenuItem(item);
    });

    resultsHTML += '</ul></div>';
    this.container.innerHTML = resultsHTML;
    this.setupCartInteractions();
  }
}

// Create and export singleton instance with duplicate prevention
let categoryMenuLoader;
if (typeof window !== 'undefined' && window.categoryMenuLoader) {
  // Use existing instance if already created
  categoryMenuLoader = window.categoryMenuLoader;
  console.log('🔄 Using existing menu loader instance');
} else {
  // Create new instance
  categoryMenuLoader = new CategoryMenuLoader();
  if (typeof window !== 'undefined') {
    window.categoryMenuLoader = categoryMenuLoader;
  }
  console.log('✅ Created new menu loader instance');

  // Auto-initialize when DOM is loaded (only for new instances)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      categoryMenuLoader.init();
    });
  } else {
    categoryMenuLoader.init();
  }
}

export { categoryMenuLoader };
