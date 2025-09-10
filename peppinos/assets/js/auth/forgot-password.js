/**
 * Forgot Password Page Module
 * Handles password reset request functionality
 */

import { authAPI } from '../api.js';
import { requireGuest } from '../auth.js';
import { validateForgotPasswordForm, displayFormErrors, clearFormErrors } from '../validation.js';
import { showLoading, hideLoading, showSuccess, showError, showInfo } from '../ui.js';

/**
 * Forgot Password Form Handler
 */
class ForgotPasswordHandler {
  constructor() {
    this.form = document.getElementById('forgotPasswordForm');
    this.emailInput = document.getElementById('email');
    this.resetBtn = document.getElementById('resetBtn');
    this.successMessage = document.getElementById('successMessage');
    this.emailSent = document.getElementById('emailSent');
    this.resendBtn = document.getElementById('resendBtn');
    this.guestForgotBtn = document.getElementById('guestForgotBtn');

    this.isLoading = false;
    this.lastEmailSent = null;
    this.resendCooldown = 60; // 60 seconds
    this.resendTimer = null;
    
    this.init();
  }

  init() {
    // Check if user is already authenticated
    requireGuest();
    
    // Bind event listeners
    this.bindEvents();
    
    // Pre-fill email from URL params if available
    this.prefillEmailFromParams();
  }

  bindEvents() {
    // Form submission
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Resend button
    this.resendBtn.addEventListener('click', this.handleResend.bind(this));

    // Guest button
    if (this.guestForgotBtn) {
      this.guestForgotBtn.addEventListener('click', this.handleGuestAccess.bind(this));
    }

    // Real-time validation
    this.emailInput.addEventListener('blur', this.validateEmail.bind(this));
    this.emailInput.addEventListener('input', this.clearEmailErrors.bind(this));
    
    // Enter key handling
    this.form.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && !this.isLoading) {
        this.handleSubmit(event);
      }
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    if (this.isLoading) return;
    
    // Clear previous errors
    clearFormErrors(this.form);
    
    // Get form data
    const formData = new FormData(this.form);
    const resetData = {
      email: formData.get('email')
    };
    
    // Validate form
    const validation = validateForgotPasswordForm(resetData);
    if (!validation.isValid) {
      displayFormErrors(this.form, validation.errors);
      return;
    }
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      // Send password reset request
      const response = await authAPI.forgotPassword(resetData.email);
      
      if (response.success) {
        // Store the email for resend functionality
        this.lastEmailSent = resetData.email;
        
        // Show success message
        this.showSuccessMessage(resetData.email);
        
        // Start resend cooldown
        this.startResendCooldown();
        
        showSuccess('Password reset link sent successfully!');
        
      } else {
        throw new Error(response.message || 'Failed to send reset link');
      }
      
    } catch (error) {
      console.error('Forgot password error:', error);
      
      // Handle specific error cases
      if (error.status === 404) {
        showError('No account found with this email address. Please check your email or create a new account.');
      } else if (error.status === 429) {
        showError('Too many reset requests. Please wait before trying again.');
      } else if (error.status === 422) {
        showError('Please enter a valid email address.');
      } else {
        showError(error.message || 'Failed to send reset link. Please try again.');
      }
      
    } finally {
      this.setLoadingState(false);
    }
  }

  async handleResend() {
    if (!this.lastEmailSent || this.isLoading) return;
    
    // Show loading state on resend button
    const originalText = this.resendBtn.textContent;
    this.resendBtn.textContent = 'Sending...';
    this.resendBtn.disabled = true;
    
    try {
      // Send password reset request again
      const response = await authAPI.forgotPassword(this.lastEmailSent);
      
      if (response.success) {
        showSuccess('Reset link sent again!');
        
        // Start resend cooldown again
        this.startResendCooldown();
        
      } else {
        throw new Error(response.message || 'Failed to resend reset link');
      }
      
    } catch (error) {
      console.error('Resend error:', error);
      showError('Failed to resend reset link. Please try again.');
      
      // Reset button state
      this.resendBtn.textContent = originalText;
      this.resendBtn.disabled = false;
      
    }
  }

  validateEmail() {
    const email = this.emailInput.value;
    if (email) {
      const validation = validateForgotPasswordForm({ email });
      if (validation.errors.email) {
        this.emailInput.classList.add('invalid');
        this.showFieldError(this.emailInput, validation.errors.email);
      } else {
        this.emailInput.classList.remove('invalid');
        this.clearFieldError(this.emailInput);
      }
    }
  }

  clearEmailErrors() {
    this.emailInput.classList.remove('invalid');
    this.clearFieldError(this.emailInput);
  }

  showFieldError(field, errors) {
    this.clearFieldError(field);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = errors.join('<br>');
    field.parentNode.appendChild(errorDiv);
  }

  clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
  }

  setLoadingState(loading) {
    this.isLoading = loading;
    
    if (loading) {
      showLoading(this.resetBtn, 'Sending...');
      this.form.style.pointerEvents = 'none';
    } else {
      hideLoading(this.resetBtn);
      this.form.style.pointerEvents = 'auto';
    }
  }

  showSuccessMessage(email) {
    // Hide the form
    this.form.style.display = 'none';
    
    // Update and show success message
    this.emailSent.textContent = email;
    this.successMessage.style.display = 'block';
  }

  startResendCooldown() {
    let timeLeft = this.resendCooldown;
    
    // Clear any existing timer
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
    
    // Disable resend button and show countdown
    this.resendBtn.disabled = true;
    this.updateResendButtonText(timeLeft);
    
    // Start countdown timer
    this.resendTimer = setInterval(() => {
      timeLeft--;
      
      if (timeLeft > 0) {
        this.updateResendButtonText(timeLeft);
      } else {
        // Enable resend button
        this.resendBtn.disabled = false;
        this.resendBtn.textContent = 'click here to resend';
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    }, 1000);
  }

  updateResendButtonText(seconds) {
    this.resendBtn.textContent = `resend in ${seconds}s`;
  }

  prefillEmailFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
      this.emailInput.value = email;
      this.emailInput.focus();
    }
  }

  /**
   * Handle guest access
   */
  async handleGuestAccess() {
    try {
      showLoading(this.guestForgotBtn, 'Continuing as guest...');

      // Create a guest user session
      const guestUser = {
        id: 'guest_' + Date.now(),
        name: 'Guest User',
        email: 'guest@peppinos.com',
        role: 'guest',
        authProvider: 'guest',
        isEmailVerified: false,
        isGuest: true
      };

      // Store guest session (without tokens)
      localStorage.setItem('peppinos_user_data', JSON.stringify(guestUser));
      localStorage.setItem('peppinos_is_guest', 'true');

      showSuccess('Welcome! You are browsing as a guest.');

      // Redirect to menu or home page
      setTimeout(() => {
        window.location.href = './index.html';
      }, 1000);

    } catch (error) {
      console.error('Guest access error:', error);
      showError('Failed to continue as guest. Please try again.');
    } finally {
      hideLoading(this.guestForgotBtn, 'Continue as Guest');
    }
  }
}

// Initialize forgot password handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ForgotPasswordHandler();
});

// Handle page visibility change to check auth state
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page became visible, check if user is now authenticated
    requireGuest();
  }
});
