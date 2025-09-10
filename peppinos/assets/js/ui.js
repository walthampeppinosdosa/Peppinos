/**
 * UI Utility Module
 * Provides common UI functions and components
 */

import { CONFIG } from './config.js';

/**
 * Toast Notifications
 */

// Create toast container if it doesn't exist
const createToastContainer = () => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
};

// Show toast notification
export const showToast = (message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) => {
  const container = createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    </div>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto remove
  const autoRemove = setTimeout(() => removeToast(toast), duration);
  
  // Manual close
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(autoRemove);
    removeToast(toast);
  });
  
  return toast;
};

// Remove toast
const removeToast = (toast) => {
  toast.classList.add('hide');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};

// Toast shortcuts
export const showSuccess = (message, duration) => showToast(message, 'success', duration);
export const showError = (message, duration) => showToast(message, 'error', duration);
export const showWarning = (message, duration) => showToast(message, 'warning', duration);
export const showInfo = (message, duration) => showToast(message, 'info', duration);

/**
 * Loading States
 */

// Show loading spinner
export const showLoading = (element, text = 'Loading...') => {
  if (!element) return;
  
  element.classList.add('loading');
  element.disabled = true;
  
  const originalContent = element.innerHTML;
  element.dataset.originalContent = originalContent;
  
  element.innerHTML = `
    <span class="loading-spinner"></span>
    <span class="loading-text">${text}</span>
  `;
  
  return () => hideLoading(element);
};

// Hide loading spinner
export const hideLoading = (element) => {
  if (!element) return;
  
  element.classList.remove('loading');
  element.disabled = false;
  
  const originalContent = element.dataset.originalContent;
  if (originalContent) {
    element.innerHTML = originalContent;
    delete element.dataset.originalContent;
  }
};

// Show page loading
export const showPageLoading = () => {
  let overlay = document.getElementById('page-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-loading-overlay';
    overlay.className = 'page-loading-overlay';
    overlay.innerHTML = `
      <div class="page-loading-content">
        <div class="loading-spinner large"></div>
        <p class="loading-text">Loading...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('show');
  return overlay;
};

// Hide page loading
export const hidePageLoading = () => {
  const overlay = document.getElementById('page-loading-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }
};

/**
 * Modal Management
 */

// Show modal
export const showModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Focus first focusable element
    const focusable = modal.querySelector('input, button, textarea, select');
    if (focusable) {
      setTimeout(() => focusable.focus(), 100);
    }
  }
};

// Hide modal
export const hideModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
};

// Close modal on outside click
export const setupModalCloseOnOutsideClick = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        hideModal(modalId);
      }
    });
  }
};

/**
 * Form Utilities
 */

// Clear form
export const clearForm = (form) => {
  if (typeof form === 'string') {
    form = document.getElementById(form);
  }
  
  if (form) {
    form.reset();
    
    // Clear custom validation states
    const invalidFields = form.querySelectorAll('.invalid');
    invalidFields.forEach(field => field.classList.remove('invalid'));
    
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(message => message.remove());
  }
};

// Serialize form data
export const serializeForm = (form) => {
  if (typeof form === 'string') {
    form = document.getElementById(form);
  }
  
  const formData = new FormData(form);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
};

/**
 * Animation Utilities
 */

// Fade in element
export const fadeIn = (element, duration = CONFIG.UI.ANIMATION_DURATION) => {
  element.style.opacity = '0';
  element.style.display = 'block';
  
  const start = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    
    element.style.opacity = progress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

// Fade out element
export const fadeOut = (element, duration = CONFIG.UI.ANIMATION_DURATION) => {
  const start = performance.now();
  const startOpacity = parseFloat(getComputedStyle(element).opacity);
  
  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    
    element.style.opacity = startOpacity * (1 - progress);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.style.display = 'none';
    }
  };
  
  requestAnimationFrame(animate);
};

// Slide down element
export const slideDown = (element, duration = CONFIG.UI.ANIMATION_DURATION) => {
  element.style.height = '0';
  element.style.overflow = 'hidden';
  element.style.display = 'block';
  
  const targetHeight = element.scrollHeight;
  const start = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    
    element.style.height = `${targetHeight * progress}px`;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.style.height = '';
      element.style.overflow = '';
    }
  };
  
  requestAnimationFrame(animate);
};

// Slide up element
export const slideUp = (element, duration = CONFIG.UI.ANIMATION_DURATION) => {
  const startHeight = element.offsetHeight;
  const start = performance.now();
  
  element.style.overflow = 'hidden';
  
  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    
    element.style.height = `${startHeight * (1 - progress)}px`;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.style.display = 'none';
      element.style.height = '';
      element.style.overflow = '';
    }
  };
  
  requestAnimationFrame(animate);
};

/**
 * Utility Functions
 */

// Debounce function
export const debounce = (func, delay = CONFIG.UI.DEBOUNCE_DELAY) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Format currency
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(new Date(date));
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard');
    return true;
  } catch (error) {
    showError('Failed to copy to clipboard');
    return false;
  }
};

export default {
  // Toast notifications
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  
  // Loading states
  showLoading,
  hideLoading,
  showPageLoading,
  hidePageLoading,
  
  // Modal management
  showModal,
  hideModal,
  setupModalCloseOnOutsideClick,
  
  // Form utilities
  clearForm,
  serializeForm,
  
  // Animations
  fadeIn,
  fadeOut,
  slideDown,
  slideUp,
  
  // Utilities
  debounce,
  throttle,
  formatCurrency,
  formatDate,
  copyToClipboard
};
