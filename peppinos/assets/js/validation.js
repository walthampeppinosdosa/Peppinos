/**
 * Form Validation Utility Module
 * Provides validation functions for forms and user input
 */

import { CONFIG } from './config.js';

/**
 * Validation Rules
 */

// Email validation
export const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  if (!CONFIG.VALIDATION.EMAIL.PATTERN.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password validation
export const validatePassword = (password) => {
  const errors = [];
  const rules = CONFIG.VALIDATION.PASSWORD;
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < rules.MIN_LENGTH) {
    errors.push(`Password must be at least ${rules.MIN_LENGTH} characters long`);
  }
  
  if (rules.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (rules.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (rules.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (rules.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  const errors = [];
  
  if (!confirmPassword) {
    errors.push('Please confirm your password');
    return { isValid: false, errors };
  }
  
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Name validation
export const validateName = (name, fieldName = 'Name') => {
  const errors = [];
  
  if (!name) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }
  
  if (name.trim().length < 2) {
    errors.push(`${fieldName} must be at least 2 characters long`);
  }
  
  if (name.trim().length > 50) {
    errors.push(`${fieldName} must be less than 50 characters long`);
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Phone number validation
export const validatePhone = (phone) => {
  const errors = [];
  
  if (!phone) {
    errors.push('Phone number is required');
    return { isValid: false, errors };
  }
  
  // Remove all non-digit characters for length check
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    errors.push('Phone number must be at least 10 digits long');
  }
  
  if (!CONFIG.VALIDATION.PHONE.PATTERN.test(phone)) {
    errors.push('Please enter a valid phone number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Required field validation
export const validateRequired = (value, fieldName) => {
  const errors = [];
  
  if (!value || (typeof value === 'string' && !value.trim())) {
    errors.push(`${fieldName} is required`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Form Validation
 */

// Login form validation
export const validateLoginForm = (formData) => {
  const errors = {};
  let isValid = true;
  
  // Validate email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
    isValid = false;
  }
  
  // Validate password
  const passwordValidation = validateRequired(formData.password, 'Password');
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors;
    isValid = false;
  }
  
  return { isValid, errors };
};

// Registration form validation
export const validateRegistrationForm = (formData) => {
  const errors = {};
  let isValid = true;
  
  // Validate name
  const nameValidation = validateName(formData.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.errors;
    isValid = false;
  }
  
  // Validate email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
    isValid = false;
  }
  
  // Validate phone (optional)
  if (formData.phone) {
    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.errors;
      isValid = false;
    }
  }
  
  // Validate password
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors;
    isValid = false;
  }
  
  // Validate confirm password
  const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.errors;
    isValid = false;
  }
  
  return { isValid, errors };
};

// Forgot password form validation
export const validateForgotPasswordForm = (formData) => {
  const errors = {};
  let isValid = true;
  
  // Validate email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
    isValid = false;
  }
  
  return { isValid, errors };
};

// Reset password form validation
export const validateResetPasswordForm = (formData) => {
  const errors = {};
  let isValid = true;
  
  // Validate password
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors;
    isValid = false;
  }
  
  // Validate confirm password
  const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.errors;
    isValid = false;
  }
  
  return { isValid, errors };
};

/**
 * Real-time Validation
 */

// Create real-time validator for a field
export const createFieldValidator = (fieldName, validationFunction) => {
  return (value) => {
    const result = validationFunction(value);
    return {
      fieldName,
      isValid: result.isValid,
      errors: result.errors
    };
  };
};

// Debounced validation
export const createDebouncedValidator = (validator, delay = CONFIG.UI.DEBOUNCE_DELAY) => {
  let timeoutId;
  
  return (value, callback) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
};

/**
 * Form Utilities
 */

// Extract form data
export const extractFormData = (form) => {
  const formData = new FormData(form);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
};

// Clear form errors
export const clearFormErrors = (form) => {
  const errorElements = form.querySelectorAll('.error-message');
  errorElements.forEach(element => element.remove());
  
  const invalidFields = form.querySelectorAll('.invalid');
  invalidFields.forEach(field => field.classList.remove('invalid'));
};

// Display form errors
export const displayFormErrors = (form, errors) => {
  clearFormErrors(form);
  
  Object.keys(errors).forEach(fieldName => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.classList.add('invalid');
      
      const errorContainer = document.createElement('div');
      errorContainer.className = 'error-message';
      errorContainer.innerHTML = errors[fieldName].join('<br>');
      
      field.parentNode.appendChild(errorContainer);
    }
  });
};

// Validate form on submit
export const validateFormOnSubmit = (form, validator) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    
    const formData = extractFormData(form);
    const validation = validator(formData);
    
    if (validation.isValid) {
      clearFormErrors(form);
      return formData;
    } else {
      displayFormErrors(form, validation.errors);
      return null;
    }
  });
};

export default {
  // Individual validators
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validatePhone,
  validateRequired,
  
  // Form validators
  validateLoginForm,
  validateRegistrationForm,
  validateForgotPasswordForm,
  validateResetPasswordForm,
  
  // Utilities
  createFieldValidator,
  createDebouncedValidator,
  extractFormData,
  clearFormErrors,
  displayFormErrors,
  validateFormOnSubmit
};
