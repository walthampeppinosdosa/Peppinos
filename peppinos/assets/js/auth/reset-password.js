/**
 * Reset Password Page Module
 * Handles password reset completion functionality
 */

import { authAPI } from '../api.js';
import { requireGuest } from '../auth.js';
import { validateResetPasswordForm, displayFormErrors, clearFormErrors } from '../validation.js';
import { showLoading, hideLoading, showSuccess, showError } from '../ui.js';
import { CONFIG } from '../config.js';

/**
 * Reset Password Form Handler
 */
class ResetPasswordHandler {
  constructor() {
    this.form = document.getElementById('resetPasswordForm');
    this.passwordInput = document.getElementById('password');
    this.confirmPasswordInput = document.getElementById('confirmPassword');
    this.passwordToggle = document.getElementById('passwordToggle');
    this.confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    this.resetBtn = document.getElementById('resetBtn');
    this.successMessage = document.getElementById('successMessage');
    this.errorMessage = document.getElementById('errorMessage');
    this.errorText = document.getElementById('errorText');
    
    this.isLoading = false;
    this.resetToken = null;
    
    this.init();
  }

  init() {
    // Check if user is already authenticated
    requireGuest();
    
    // Get reset token from URL
    this.extractResetToken();
    
    // Validate token before showing form
    this.validateResetToken();
    
    // Bind event listeners
    this.bindEvents();
  }

  bindEvents() {
    // Form submission
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Password toggles
    this.passwordToggle.addEventListener('click', () => this.togglePassword(this.passwordInput, this.passwordToggle));
    this.confirmPasswordToggle.addEventListener('click', () => this.togglePassword(this.confirmPasswordInput, this.confirmPasswordToggle));
    
    // Real-time validation
    this.passwordInput.addEventListener('input', this.validatePassword.bind(this));
    this.confirmPasswordInput.addEventListener('input', this.validateConfirmPassword.bind(this));
    
    // Enter key handling
    this.form.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && !this.isLoading) {
        this.handleSubmit(event);
      }
    });
  }

  extractResetToken() {
    const urlParams = new URLSearchParams(window.location.search);
    this.resetToken = urlParams.get('token');
    
    if (!this.resetToken) {
      this.showError('No reset token provided. Please use the link from your email.');
      return;
    }
  }

  async validateResetToken() {
    if (!this.resetToken) return;
    
    try {
      // Verify the reset token with the backend
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/auth/verify-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: this.resetToken })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid reset token');
      }
      
      // Token is valid, show the form
      this.form.style.display = 'block';
      
    } catch (error) {
      console.error('Token validation error:', error);
      this.showError(error.message || 'This reset link is invalid or has expired.');
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    if (this.isLoading || !this.resetToken) return;
    
    // Clear previous errors
    clearFormErrors(this.form);
    
    // Get form data
    const formData = new FormData(this.form);
    const resetData = {
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword')
    };
    
    // Validate form
    const validation = validateResetPasswordForm(resetData);
    if (!validation.isValid) {
      displayFormErrors(this.form, validation.errors);
      return;
    }
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      // Reset password
      const response = await authAPI.resetPassword(this.resetToken, resetData.password);
      
      if (response.success) {
        // Show success message
        this.showSuccess();
        
        showSuccess('Password reset successfully!');
        
      } else {
        throw new Error(response.message || 'Failed to reset password');
      }
      
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Handle specific error cases
      if (error.status === 400) {
        showError('Invalid or expired reset token. Please request a new password reset.');
        this.showError('This reset link has expired. Please request a new one.');
      } else if (error.status === 422) {
        showError('Please check your password and try again.');
        
        // Display field-specific errors if available
        if (error.data && error.data.errors) {
          displayFormErrors(this.form, error.data.errors);
        }
      } else if (error.status === 429) {
        showError('Too many reset attempts. Please try again later.');
      } else {
        showError(error.message || 'Failed to reset password. Please try again.');
      }
      
    } finally {
      this.setLoadingState(false);
    }
  }

  togglePassword(input, toggle) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    const icon = toggle.querySelector('ion-icon');
    icon.name = isPassword ? 'eye-off-outline' : 'eye-outline';
  }

  validatePassword() {
    const password = this.passwordInput.value;
    if (password) {
      const validation = validateResetPasswordForm({ 
        password, 
        confirmPassword: this.confirmPasswordInput.value || 'dummy' 
      });
      
      if (validation.errors.password) {
        this.passwordInput.classList.add('invalid');
        this.showFieldError(this.passwordInput, validation.errors.password);
      } else {
        this.passwordInput.classList.remove('invalid');
        this.clearFieldError(this.passwordInput);
      }
      
      // Also validate confirm password if it has a value
      if (this.confirmPasswordInput.value) {
        this.validateConfirmPassword();
      }
    }
  }

  validateConfirmPassword() {
    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;
    
    if (confirmPassword) {
      const validation = validateResetPasswordForm({ password, confirmPassword });
      
      if (validation.errors.confirmPassword) {
        this.confirmPasswordInput.classList.add('invalid');
        this.showFieldError(this.confirmPasswordInput, validation.errors.confirmPassword);
      } else {
        this.confirmPasswordInput.classList.remove('invalid');
        this.clearFieldError(this.confirmPasswordInput);
      }
    }
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
      showLoading(this.resetBtn, 'Resetting...');
      this.form.style.pointerEvents = 'none';
    } else {
      hideLoading(this.resetBtn);
      this.form.style.pointerEvents = 'auto';
    }
  }

  showSuccess() {
    // Hide the form and footer
    this.form.style.display = 'none';
    document.querySelector('.auth-footer').style.display = 'none';
    
    // Show success message
    this.successMessage.style.display = 'block';
  }

  showError(message) {
    // Hide the form and footer
    this.form.style.display = 'none';
    document.querySelector('.auth-footer').style.display = 'none';
    
    // Update and show error message
    this.errorText.textContent = message;
    this.errorMessage.style.display = 'block';
  }
}

// Initialize reset password handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ResetPasswordHandler();
});

// Handle page visibility change to check auth state
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page became visible, check if user is now authenticated
    requireGuest();
  }
});
