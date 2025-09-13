/**
 * Cart Options Service
 * Handles cart options modal and validation
 */

import { cartService } from './cart-service.js';
import { menuService } from './menu-service.js';
import { showError } from '../ui.js';

class CartOptionsService {
  constructor() {
    this.currentItem = null;
    this.currentModal = null;
    this.setupEventListeners();
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Handle add to cart button clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart-btn')) {
        e.preventDefault();
        this.handleAddToCartClick(e.target.closest('.add-to-cart-btn'));
      }
      
      // Handle modal close
      if (e.target.closest('[data-modal-close]')) {
        this.closeModal();
      }
      
      // Handle quantity buttons
      if (e.target.closest('.quantity-btn')) {
        this.handleQuantityChange(e.target.closest('.quantity-btn'));
      }
      
      // Handle confirm add to cart
      if (e.target.id && e.target.id.startsWith('confirmAddToCart-')) {
        const itemId = e.target.id.replace('confirmAddToCart-', '');
        this.confirmAddToCart(itemId);
      }
    });

    // Handle quantity input changes
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        this.validateQuantity(e.target);
      }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.closeModal();
      }
    });
  }

  /**
   * Handle add to cart button click
   */
  async handleAddToCartClick(button) {
    const itemId = button.dataset.itemId;
    const itemName = button.dataset.itemName;
    const itemPrice = button.dataset.itemPrice;
    const isVeg = button.dataset.isVeg === 'true';

    try {
      // Get full item data from backend
      const itemData = await this.getItemData(itemId);

      if (!itemData) {
        showError('Failed to load item details');
        return;
      }

      this.currentItem = itemData;

      // Check if item has options that require user selection
      if (this.hasCartOptions(itemData)) {
        // Show options modal directly
        this.showOptionsModal(itemId);
      } else {
        // Add directly to cart with default values
        const defaultOptions = this.getDefaultOptions(itemData);
        await this.addToCartDirectly(itemData, defaultOptions);
        // Toast is already shown by cartService.addToCart
      }
    } catch (error) {
      console.error('Error handling add to cart:', error);
      showError('Failed to add item to cart');
    }
  }

  /**
   * Get item data from backend
   */
  async getItemData(itemId) {
    try {
      const itemData = await menuService.getMenuItemById(itemId);
      return itemData;
    } catch (error) {
      console.error('Error getting item data:', error);
      return null;
    }
  }

  /**
   * Get default options for an item
   */
  getDefaultOptions(item) {
    const options = {
      quantity: 1,
      size: 'Medium',
      spicyLevel: '',
      preparations: [],
      addons: [],
      specialInstructions: ''
    };

    // Set default size if available
    if (item.sizes && item.sizes.length > 0) {
      const defaultSize = item.sizes.find(size => size.isDefault);
      options.size = defaultSize ? defaultSize.name : item.sizes[0].name;
    }

    // Set default spicy level if available
    if (item.spicyLevel && item.spicyLevel.length > 0) {
      // For non-veg items, spicy level might be required
      if (!item.isVegetarian) {
        options.spicyLevel = item.spicyLevel[0].name || item.spicyLevel[0];
      }
    }

    return options;
  }

  /**
   * Validate required fields for an item
   */
  validateRequiredFields(item, options) {
    const missingFields = [];

    // Size is required if multiple sizes are available
    if (item.sizes && item.sizes.length > 1 && !options.size) {
      missingFields.push('size');
    }

    // Spicy level is required for non-veg items if options are available
    if (!item.isVegetarian && item.spicyLevel && item.spicyLevel.length > 0 && !options.spicyLevel) {
      missingFields.push('spicy level');
    }

    // Preparation options might be required for veg items
    if (item.isVegetarian && item.preparations && item.preparations.length > 0 && options.preparations.length === 0) {
      missingFields.push('preparation options');
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Please select ${missingFields.join(', ')} for this item`
      };
    }

    return { isValid: true };
  }

  /**
   * Check if item has required options (legacy method)
   */
  hasRequiredOptions(item) {
    // Check if item has sizes (required)
    if (item.sizes && item.sizes.length > 0) {
      return true;
    }

    // Check if item has other options that might be required
    if (item.spicyLevel && item.spicyLevel.length > 0) {
      return true;
    }

    if (item.preparations && item.preparations.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Show options modal
   */
  showOptionsModal(itemId) {
    let modal = document.getElementById(`cartModal-${itemId}`);

    // Create modal if it doesn't exist
    if (!modal) {
      modal = this.createModal(itemId, this.currentItem);
      if (!modal) {
        showError('Failed to create options modal');
        return;
      }
    }

    this.currentModal = modal;
    modal.style.display = 'flex';

    // Trigger animation
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Create modal dynamically
   */
  createModal(itemId, item) {
    if (!item) return null;

    const modalHTML = this.createCartOptionsModal(item);

    // Get or create modals container
    let container = document.getElementById('cart-modals-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cart-modals-container';
      document.body.appendChild(container);
    }

    // Add modal to container
    container.insertAdjacentHTML('beforeend', modalHTML);

    return document.getElementById(`cartModal-${itemId}`);
  }

  /**
   * Close modal
   */
  closeModal() {
    if (!this.currentModal) return;

    this.currentModal.classList.remove('show');
    
    setTimeout(() => {
      this.currentModal.style.display = 'none';
      document.body.style.overflow = '';
      this.currentModal = null;
      this.currentItem = null;
    }, 300);
  }

  /**
   * Handle quantity change
   */
  handleQuantityChange(button) {
    const action = button.dataset.action;
    const quantityInput = button.parentElement.querySelector('.quantity-input');
    let currentValue = parseInt(quantityInput.value) || 1;

    if (action === 'increase') {
      currentValue = Math.min(currentValue + 1, 10);
    } else if (action === 'decrease') {
      currentValue = Math.max(currentValue - 1, 1);
    }

    quantityInput.value = currentValue;
  }

  /**
   * Validate quantity input
   */
  validateQuantity(input) {
    let value = parseInt(input.value) || 1;
    value = Math.max(1, Math.min(value, 10));
    input.value = value;
  }

  /**
   * Confirm add to cart with selected options
   */
  async confirmAddToCart(itemId) {
    try {
      const modal = document.getElementById(`cartModal-${itemId}`);
      if (!modal) return;

      // Set current modal for validation
      this.currentModal = modal;

      // Collect form data
      const formData = this.collectFormData(modal);

      // Validate required fields
      const validation = this.validateFormData(formData);
      if (!validation.isValid) {
        showError(validation.message);
        return;
      }

      // Add to cart
      await cartService.addToCart(
        itemId,
        formData.quantity,
        formData.size,
        formData.addons,
        formData.specialInstructions
      );

      // Close modal
      this.closeModal();

    } catch (error) {
      console.error('Error adding to cart:', error);
      showError('Failed to add item to cart');
    }
  }

  /**
   * Collect form data from modal
   */
  collectFormData(modal) {
    const quantity = parseInt(modal.querySelector('.quantity-input')?.value) || 1;
    
    const sizeInput = modal.querySelector('input[name="size"]:checked');
    const size = sizeInput ? sizeInput.value : 'Medium';
    
    const spicyLevelInput = modal.querySelector('input[name="spicyLevel"]:checked');
    const spicyLevel = spicyLevelInput ? spicyLevelInput.value : '';
    
    const preparationInputs = modal.querySelectorAll('input[name="preparations"]:checked');
    const preparations = Array.from(preparationInputs).map(input => input.value);
    
    const specialInstructions = modal.querySelector('.special-instructions-input')?.value || '';

    return {
      quantity,
      size,
      spicyLevel,
      preparations,
      specialInstructions,
      addons: [] // For now, we'll handle addons separately
    };
  }

  /**
   * Validate form data
   */
  validateFormData(formData) {
    // Check if size is required and selected
    const modal = this.currentModal;
    if (!modal) {
      console.error('No current modal found for validation');
      return {
        isValid: false,
        message: 'Modal not found'
      };
    }

    const hasSizes = modal.querySelector('input[name="size"]');

    if (hasSizes && !formData.size) {
      return {
        isValid: false,
        message: 'Please select a size'
      };
    }

    if (formData.quantity < 1 || formData.quantity > 10) {
      return {
        isValid: false,
        message: 'Quantity must be between 1 and 10'
      };
    }

    return {
      isValid: true,
      message: ''
    };
  }

  /**
   * Add to cart directly with provided options
   */
  async addToCartDirectly(item, options = null) {
    try {
      // Use provided options or defaults
      const opts = options || this.getDefaultOptions(item);

      await cartService.addToCart(
        item._id,
        opts.quantity,
        opts.size,
        opts.addons,
        opts.specialInstructions
      );
    } catch (error) {
      console.error('Error adding to cart directly:', error);
      showError('Failed to add item to cart');
    }
  }

  /**
   * Create cart options modal for menu item
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
            ${this.renderSpecialInstructions()}
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
   */
  hasCartOptions(item) {
    console.log('Checking cart options for item:', item.name, {
      sizes: item.sizes?.length || 0,
      spicyLevel: item.spicyLevel?.length || 0,
      preparations: item.preparations?.length || 0
    });

    return (
      (item.sizes && item.sizes.length > 0) ||
      (item.spicyLevel && item.spicyLevel.length > 0) ||
      (item.preparations && item.preparations.length > 0)
    );
  }

  /**
   * Render quantity selector
   */
  renderQuantitySelector() {
    return `
      <div class="option-group">
        <label class="option-label">Quantity</label>
        <div class="quantity-selector">
          <button type="button" class="quantity-btn" data-action="decrease">-</button>
          <input type="number" class="quantity-input" value="1" min="1" max="10">
          <button type="button" class="quantity-btn" data-action="increase">+</button>
        </div>
      </div>
    `;
  }

  /**
   * Render size options
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
   */
  renderSpicyLevelOptions(spicyLevels) {
    if (!spicyLevels || spicyLevels.length === 0) return '';

    const spicyOptions = spicyLevels.map(level => {
      // Handle both string values and object values
      const levelName = typeof level === 'string' ? level : (level.name || level);
      const levelDesc = typeof level === 'object' ? level.description : '';

      return `
        <label class="radio-option">
          <input type="radio" name="spicyLevel" value="${levelName}">
          <span class="radio-label">
            <span class="spicy-name">${levelName}</span>
            ${levelDesc ? `<span class="spicy-desc">${levelDesc}</span>` : ''}
          </span>
        </label>
      `;
    }).join('');

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
   */
  renderPreparationOptions(preparations) {
    if (!preparations || preparations.length === 0) return '';

    const prepOptions = preparations.map(prep => {
      // Handle both string values and object values
      const prepName = typeof prep === 'string' ? prep : (prep.name || prep);
      const prepDesc = typeof prep === 'object' ? prep.description : '';

      return `
        <label class="checkbox-option">
          <input type="checkbox" name="preparations" value="${prepName}">
          <span class="checkbox-label">
            <span class="prep-name">${prepName}</span>
            ${prepDesc ? `<span class="prep-desc">${prepDesc}</span>` : ''}
          </span>
        </label>
      `;
    }).join('');

    return `
      <div class="option-group">
        <label class="option-label">Preparation Options</label>
        <div class="checkbox-group">
          ${prepOptions}
        </div>
      </div>
    `;
  }

  /**
   * Render special instructions
   */
  renderSpecialInstructions() {
    return `
      <div class="option-group">
        <label class="option-label">Special Instructions</label>
        <textarea class="special-instructions-input"
                  placeholder="Any special requests or dietary requirements..."
                  maxlength="200"></textarea>
      </div>
    `;
  }


}

// Export the class
export { CartOptionsService };

// Create and export singleton instance
export const cartOptionsService = new CartOptionsService();

// Make it globally accessible
window.cartOptionsService = cartOptionsService;

export default cartOptionsService;
