/**
 * Register Page Module
 * Handles user registration and account creation
 */

import { authAPI } from '../api.js';
import { loginUser, requireGuest, getRedirectUrl } from '../auth.js';
import { validateRegistrationForm, displayFormErrors, clearFormErrors } from '../validation.js';
import { showLoading, hideLoading, showSuccess, showError, showInfo } from '../ui.js';
import { CONFIG } from '../config.js';
import { kindeService } from '../services/kinde-service.js';

/**
 * Registration Form Handler
 */
class RegisterHandler {
  constructor() {
    this.form = document.getElementById('registerForm');
    this.nameInput = document.getElementById('name');
    this.emailInput = document.getElementById('email');
    this.phoneInput = document.getElementById('phone');
    this.passwordInput = document.getElementById('password');
    this.confirmPasswordInput = document.getElementById('confirmPassword');
    this.passwordToggle = document.getElementById('passwordToggle');
    this.confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    this.registerBtn = document.getElementById('registerBtn');
    this.googleSignupBtn = document.getElementById('googleSignupBtn');
    this.guestSignupBtn = document.getElementById('guestSignupBtn');
    this.agreeToTermsCheckbox = document.getElementById('agreeToTerms');
    this.subscribeNewsletterCheckbox = document.getElementById('subscribeNewsletter');
    
    this.isLoading = false;
    
    this.init();
  }

  init() {
    // Check if user is already authenticated
    requireGuest();
    
    // Bind event listeners
    this.bindEvents();
  }

  bindEvents() {
    // Form submission
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Password toggles
    this.passwordToggle.addEventListener('click', () => this.togglePassword(this.passwordInput, this.passwordToggle));
    this.confirmPasswordToggle.addEventListener('click', () => this.togglePassword(this.confirmPasswordInput, this.confirmPasswordToggle));
    
    // Google signup
    this.googleSignupBtn.addEventListener('click', this.handleGoogleSignup.bind(this));

    // Guest signup
    if (this.guestSignupBtn) {
      this.guestSignupBtn.addEventListener('click', this.handleGuestSignup.bind(this));
    }

    // Real-time validation
    this.nameInput.addEventListener('blur', this.validateName.bind(this));
    this.emailInput.addEventListener('blur', this.validateEmail.bind(this));
    this.phoneInput.addEventListener('blur', this.validatePhone.bind(this));
    this.passwordInput.addEventListener('input', this.validatePassword.bind(this));
    this.confirmPasswordInput.addEventListener('input', this.validateConfirmPassword.bind(this));
    
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
    const registrationData = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      agreeToTerms: formData.get('agreeToTerms') === 'on',
      subscribeNewsletter: formData.get('subscribeNewsletter') === 'on'
    };
    
    // Validate form
    const validation = validateRegistrationForm(registrationData);
    if (!validation.isValid) {
      displayFormErrors(this.form, validation.errors);
      return;
    }
    
    // Check terms agreement
    if (!registrationData.agreeToTerms) {
      showError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      // Attempt registration
      const response = await authAPI.register({
        name: registrationData.name,
        email: registrationData.email,
        phone: registrationData.phone || undefined,
        password: registrationData.password,
        subscribeNewsletter: registrationData.subscribeNewsletter
      });
      
      if (response.success) {
        // Check if email verification is required
        if (response.data.requiresEmailVerification) {
          showInfo('Registration successful! Please check your email to verify your account before signing in.');
          
          // Redirect to login with email pre-filled
          setTimeout(() => {
            window.location.href = `login.html?email=${encodeURIComponent(registrationData.email)}`;
          }, 2000);
          
        } else {
          // Auto-login if no email verification required
          const user = loginUser(response.data);
          
          // Show success message
          showSuccess(`Welcome to Peppino's Dosa, ${user.name}!`);
          
          // Redirect to intended page or home
          const redirectUrl = getRedirectUrl('./index.html');

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1500);
        }
        
      } else {
        throw new Error(response.message || 'Registration failed');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error.status === 409) {
        showError('An account with this email already exists. Please sign in instead.');
        
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = `login.html?email=${encodeURIComponent(registrationData.email)}`;
        }, 2000);
        
      } else if (error.status === 422) {
        showError('Please check your information and try again.');
        
        // Display field-specific errors if available
        if (error.data && error.data.errors) {
          displayFormErrors(this.form, error.data.errors);
        }
        
      } else if (error.status === 429) {
        showError('Too many registration attempts. Please try again later.');
      } else {
        showError(error.message || 'Registration failed. Please try again.');
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

  validateName() {
    const name = this.nameInput.value;
    if (name) {
      const validation = validateRegistrationForm({ 
        name, 
        email: 'test@example.com', 
        password: 'Test123!', 
        confirmPassword: 'Test123!' 
      });
      
      if (validation.errors.name) {
        this.nameInput.classList.add('invalid');
        this.showFieldError(this.nameInput, validation.errors.name);
      } else {
        this.nameInput.classList.remove('invalid');
        this.clearFieldError(this.nameInput);
      }
    }
  }

  validateEmail() {
    const email = this.emailInput.value;
    if (email) {
      const validation = validateRegistrationForm({ 
        name: 'Test User', 
        email, 
        password: 'Test123!', 
        confirmPassword: 'Test123!' 
      });
      
      if (validation.errors.email) {
        this.emailInput.classList.add('invalid');
        this.showFieldError(this.emailInput, validation.errors.email);
      } else {
        this.emailInput.classList.remove('invalid');
        this.clearFieldError(this.emailInput);
      }
    }
  }

  validatePhone() {
    const phone = this.phoneInput.value;
    if (phone) {
      const validation = validateRegistrationForm({ 
        name: 'Test User', 
        email: 'test@example.com', 
        phone,
        password: 'Test123!', 
        confirmPassword: 'Test123!' 
      });
      
      if (validation.errors.phone) {
        this.phoneInput.classList.add('invalid');
        this.showFieldError(this.phoneInput, validation.errors.phone);
      } else {
        this.phoneInput.classList.remove('invalid');
        this.clearFieldError(this.phoneInput);
      }
    }
  }

  validatePassword() {
    const password = this.passwordInput.value;
    if (password) {
      const validation = validateRegistrationForm({ 
        name: 'Test User', 
        email: 'test@example.com', 
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
      const validation = validateRegistrationForm({ 
        name: 'Test User', 
        email: 'test@example.com', 
        password, 
        confirmPassword 
      });
      
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
      showLoading(this.registerBtn, 'Creating Account...');
      this.form.style.pointerEvents = 'none';
    } else {
      hideLoading(this.registerBtn);
      this.form.style.pointerEvents = 'auto';
    }
  }

  /**
   * Google Sign-up using Kinde (No SDK)
   */
  async handleGoogleSignup() {
    try {
      // Show loading state
      showLoading(this.googleSignupBtn, 'Redirecting to Google...');

      // Use Kinde service to initiate Google sign-up
      await kindeService.initiateSignUp();

    } catch (error) {
      console.error('Google signup error:', error);
      showError('Google sign-up failed. Please try again.');
      hideLoading(this.googleSignupBtn, 'Sign up with Google');
    }
  }



  /**
   * Handle guest signup
   */
  async handleGuestSignup() {
    try {
      showLoading(this.guestSignupBtn, 'Continuing as guest...');

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
      console.error('Guest signup error:', error);
      showError('Failed to continue as guest. Please try again.');
    } finally {
      hideLoading(this.guestSignupBtn, 'Continue as Guest');
    }
  }
}

// Initialize register handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RegisterHandler();
});

// Handle page visibility change to check auth state
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page became visible, check if user is now authenticated
    requireGuest();
  }
});
