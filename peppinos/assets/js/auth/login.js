/**
 * Login Page Module
 * Handles user authentication and login functionality
 */

import { authAPI } from '../api.js';
import { loginUser, requireGuest, getRedirectUrl, isAuthenticated } from '../auth.js';
import { validateLoginForm, displayFormErrors, clearFormErrors } from '../validation.js';
import { showLoading, hideLoading, showSuccess, showError } from '../ui.js';
import { CONFIG } from '../config.js';
import { kindeService } from '../services/kinde-service.js';

/**
 * Login Form Handler
 */
class LoginHandler {
  constructor() {
    this.form = document.getElementById('loginForm');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.passwordToggle = document.getElementById('passwordToggle');
    this.loginBtn = document.getElementById('loginBtn');
    this.googleLoginBtn = document.getElementById('googleLoginBtn');
    this.guestLoginBtn = document.getElementById('guestLoginBtn');
    this.rememberMeCheckbox = document.getElementById('rememberMe');
    
    this.isLoading = false;
    this.lastSubmitTime = 0;
    this.submitCooldown = 1000; // 1 second cooldown between attempts
    
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
    
    // Password toggle
    this.passwordToggle.addEventListener('click', this.togglePassword.bind(this));
    
    // Google login
    this.googleLoginBtn.addEventListener('click', this.handleGoogleLogin.bind(this));

    // Guest login
    if (this.guestLoginBtn) {
      this.guestLoginBtn.addEventListener('click', this.handleGuestLogin.bind(this));
    }

    // Real-time validation
    this.emailInput.addEventListener('blur', this.validateEmail.bind(this));
    this.passwordInput.addEventListener('input', this.clearPasswordErrors.bind(this));
    
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

    // Prevent rapid successive submissions
    const now = Date.now();
    if (now - this.lastSubmitTime < this.submitCooldown) {
      console.log('⏳ Login attempt too soon, please wait...');
      return;
    }
    this.lastSubmitTime = now;

    console.log('🔄 Login form submitted');

    // Clear previous errors and UI state
    clearFormErrors(this.form);

    // Clear any existing error toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Get form data
    const formData = new FormData(this.form);
    const loginData = {
      email: formData.get('email'),
      password: formData.get('password'),
      rememberMe: formData.get('rememberMe') === 'on'
    };

    console.log('📧 Login attempt for email:', loginData.email);
    
    // Validate form
    const validation = validateLoginForm(loginData);
    if (!validation.isValid) {
      displayFormErrors(this.form, validation.errors);
      return;
    }
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      // Attempt login
      const response = await authAPI.login({
        email: loginData.email,
        password: loginData.password
      });
      
      if (response.success) {
        console.log('✅ Login API response successful:', response);

        // Store authentication data
        const user = loginUser(response.data);
        console.log('👤 User logged in:', user);

        // Check authentication status
        console.log('🔐 Is authenticated after login:', isAuthenticated());
        console.log('💾 Auth data in storage:', {
          token: localStorage.getItem('accessToken'),
          user: localStorage.getItem('currentUser')
        });

        // Show success message
        showSuccess(`Welcome back, ${user.name}!`);

        // Redirect immediately after successful login
        console.log('🔄 Preparing immediate redirect after successful login...');
        console.log('📍 Current location:', window.location.href);
        console.log('📍 Current pathname:', window.location.pathname);
        console.log('📍 Current origin:', window.location.origin);

        // Construct the correct path explicitly
        const currentPath = window.location.pathname; // e.g., "/peppinos/login.html"
        const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/')); // e.g., "/peppinos"
        const indexPath = currentDir + '/index.html'; // e.g., "/peppinos/index.html"
        const fullUrl = window.location.origin + indexPath; // e.g., "http://localhost:5500/peppinos/index.html"

        console.log('🎯 Current directory:', currentDir);
        console.log('🎯 Index path:', indexPath);
        console.log('🎯 Full target URL:', fullUrl);
        console.log('🚀 Executing immediate redirect...');
        console.log('🔐 Final auth check before redirect:', isAuthenticated());

        // Add a small delay to ensure auth state is set
        setTimeout(() => {
          console.log('🔄 Delayed redirect executing...');
          console.log('🔐 Auth check at redirect time:', isAuthenticated());
          window.location.href = fullUrl;
        }, 100);
        
      } else {
        throw new Error(response.message || 'Login failed');
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error status:', error.status);
      console.error('❌ Error message:', error.message);

      // Clear any loading states and reset form
      this.setLoadingState(false);

      // Handle specific error cases
      if (error.status === 401) {
        console.log('🔐 Authentication failed - showing error toast');
        showError('Invalid email or password. Please try again.');
      } else if (error.status === 403) {
        showError('Your account has been suspended. Please contact support.');
      } else if (error.status === 429) {
        console.log('⏰ Rate limit exceeded');
        showError('Too many login attempts. Please wait a moment and try again.');
        // Reset the form state after rate limit error
        setTimeout(() => {
          this.resetFormState();
          console.log('🔄 Rate limit cooldown - form reset');
        }, 2000);
      } else {
        showError(error.message || 'Login failed. Please try again.');
      }

      // Ensure form is ready for next attempt
      setTimeout(() => {
        console.log('🔄 Form ready for next login attempt');
      }, 100);

    } finally {
      // Ensure loading state is always cleared
      this.setLoadingState(false);
    }
  }

  togglePassword() {
    const isPassword = this.passwordInput.type === 'password';
    this.passwordInput.type = isPassword ? 'text' : 'password';
    
    const icon = this.passwordToggle.querySelector('ion-icon');
    icon.name = isPassword ? 'eye-off-outline' : 'eye-outline';
  }

  validateEmail() {
    const email = this.emailInput.value;
    if (email) {
      const validation = validateLoginForm({ email, password: 'dummy' });
      if (validation.errors.email) {
        this.emailInput.classList.add('invalid');
        this.showFieldError(this.emailInput, validation.errors.email);
      } else {
        this.emailInput.classList.remove('invalid');
        this.clearFieldError(this.emailInput);
      }
    }
  }

  clearPasswordErrors() {
    this.passwordInput.classList.remove('invalid');
    this.clearFieldError(this.passwordInput);
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
      showLoading(this.loginBtn, 'Signing In...');
      this.form.style.pointerEvents = 'none';
    } else {
      hideLoading(this.loginBtn);
      this.form.style.pointerEvents = 'auto';
    }
  }

  resetFormState() {
    console.log('🔄 Resetting form state');
    this.setLoadingState(false);
    clearFormErrors(this.form);

    // Clear any existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    // Reset submit cooldown
    this.lastSubmitTime = 0;
  }

  prefillEmailFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
      this.emailInput.value = email;
      this.passwordInput.focus();
    }
  }

  /**
   * Google Sign-in using Kinde (No SDK)
   */
  async handleGoogleLogin() {
    try {

      showLoading(this.googleLoginBtn, 'Redirecting to Google...');

      await kindeService.initiateGoogleSignIn();


    } catch (error) {
      console.error('❌ Google login error:', error);
      console.error('Error stack:', error.stack);
      showError(`Google sign-in failed: ${error.message}`);
      hideLoading(this.googleLoginBtn, `
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      `);
    }
  }



  /**
   * Handle guest login
   */
  async handleGuestLogin() {
    try {
      showLoading(this.guestLoginBtn, 'Continuing as guest...');

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
      console.error('Guest login error:', error);
      showError('Failed to continue as guest. Please try again.');
    } finally {
      hideLoading(this.guestLoginBtn, 'Continue as Guest');
    }
  }
}

// Initialize login handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LoginHandler();
});

// Handle page visibility change to check auth state
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page became visible, check if user is now authenticated
    requireGuest();
  }
});
