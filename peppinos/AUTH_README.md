# Peppino's Dosa - Authentication System

## Overview

This document describes the complete authentication system implemented for the Peppino's Dosa frontend application. The system supports multiple authentication flows including traditional email/password registration, Google Sign-in via Kinde Auth, and guest checkout functionality.

## Architecture

### Modular ES6 Structure

The authentication system follows a modular ES6 architecture with the following key modules:

- **`config.js`** - Centralized configuration management
- **`api.js`** - HTTP client and API endpoint functions
- **`auth.js`** - Authentication state management and utilities
- **`validation.js`** - Form validation functions
- **`ui.js`** - UI utilities (toasts, loading states, animations)
- **`navigation.js`** - Dynamic navigation updates based on auth state

### Authentication Pages

1. **Login Page** (`login.html`) - User sign-in with email/password and Google
2. **Register Page** (`register.html`) - New user registration
3. **Forgot Password Page** (`forgot-password.html`) - Password reset request
4. **Reset Password Page** (`reset-password.html`) - Password reset completion
5. **Auth Callback Page** (`auth-callback.html`) - Kinde authentication callback handler

## Features

### Core Authentication Features

- ✅ **Email/Password Registration** - Traditional account creation
- ✅ **Email/Password Login** - Standard authentication
- ✅ **Google Sign-in** - OAuth via Kinde Auth provider
- ✅ **Password Reset** - Forgot password flow with email verification
- ✅ **Guest Checkout** - Browse and order without registration
- ✅ **Session Management** - Automatic token refresh and session validation
- ✅ **Role-Based Access** - Support for different user roles

### Security Features

- ✅ **JWT Token Authentication** - Secure token-based auth
- ✅ **Automatic Token Refresh** - Seamless session management
- ✅ **Password Validation** - Strong password requirements
- ✅ **Email Verification** - Optional email verification flow
- ✅ **CSRF Protection** - Cross-site request forgery protection
- ✅ **Input Validation** - Comprehensive form validation

### User Experience Features

- ✅ **Real-time Validation** - Instant feedback on form inputs
- ✅ **Loading States** - Visual feedback during API calls
- ✅ **Toast Notifications** - Success/error message system
- ✅ **Responsive Design** - Mobile-friendly authentication pages
- ✅ **Dark Mode Compatible** - Consistent theming
- ✅ **Remember Me** - Optional persistent sessions

## Configuration

### Environment Variables

The system uses environment-specific configuration in `config.js`:

```javascript
// Development
CONFIG.API.BASE_URL = 'http://localhost:5000';

// Staging
CONFIG.API.BASE_URL = 'https://staging-api.peppinosdosa.com';

// Production
CONFIG.API.BASE_URL = 'https://api.peppinosdosa.com';
```

### Kinde Auth Configuration

```javascript
CONFIG.KINDE = {
  DOMAIN: 'https://peppinos.kinde.com',
  CLIENT_ID: 'your_kinde_client_id',
  REDIRECT_URI: 'http://localhost:3000/auth-callback.html',
  LOGOUT_URI: 'http://localhost:3000',
  SCOPE: 'openid profile email'
};
```

## API Integration

### Backend Endpoints

The frontend integrates with the following backend endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset completion
- `POST /api/auth/kinde-sync` - Kinde user synchronization
- `POST /api/auth/verify-reset-token` - Reset token validation
- `GET /api/auth/profile` - Get user profile

### Kinde Integration

The system includes comprehensive Kinde Auth integration:

1. **User Registration/Login** - Redirects to Kinde for Google authentication
2. **User Data Sync** - Automatically syncs Kinde user data with local database
3. **Token Management** - Handles Kinde tokens and local JWT tokens
4. **Error Handling** - Graceful fallback for Kinde authentication failures

## Usage

### Basic Implementation

Include the authentication modules in your HTML pages:

```html
<!-- Authentication CSS -->
<link rel="stylesheet" href="./assets/css/auth.css">

<!-- Authentication JavaScript -->
<script type="module" src="./assets/js/auth/login.js"></script>
<script type="module" src="./assets/js/navigation.js"></script>
```

### Authentication State Management

```javascript
import { isAuthenticated, getCurrentUser, loginUser, logoutUser } from './auth.js';

// Check if user is authenticated
if (isAuthenticated()) {
  const user = getCurrentUser();
  console.log('User:', user.name);
}

// Listen for authentication changes
addAuthListener((isAuth, user) => {
  if (isAuth) {
    console.log('User logged in:', user.name);
  } else {
    console.log('User logged out');
  }
});
```

### API Calls

```javascript
import { authAPI, userAPI } from './api.js';

// Login user
try {
  const response = await authAPI.login({ email, password });
  if (response.success) {
    loginUser(response.data);
  }
} catch (error) {
  console.error('Login failed:', error);
}

// Get user profile
try {
  const user = await userAPI.getProfile();
  console.log('Profile:', user);
} catch (error) {
  console.error('Failed to get profile:', error);
}
```

## Testing

### Authentication Test Page

A comprehensive test page is available at `test-auth.html` that provides:

- Authentication status display
- API connectivity testing
- Endpoint validation
- Configuration verification
- Manual logout functionality

### Running Tests

1. Open `test-auth.html` in your browser
2. Click "Test API Connection" to verify backend connectivity
3. Test authentication flows using the provided links
4. Monitor browser console for detailed logs

## File Structure

```
peppinos/
├── assets/
│   ├── css/
│   │   └── auth.css                 # Authentication styles
│   └── js/
│       ├── config.js                # Configuration management
│       ├── api.js                   # API client and endpoints
│       ├── auth.js                  # Authentication utilities
│       ├── validation.js            # Form validation
│       ├── ui.js                    # UI utilities
│       ├── navigation.js            # Navigation management
│       ├── test-auth.js             # Authentication testing
│       └── auth/
│           ├── login.js             # Login page logic
│           ├── register.js          # Registration page logic
│           ├── forgot-password.js   # Forgot password logic
│           ├── reset-password.js    # Reset password logic
│           └── callback.js          # Kinde callback handler
├── login.html                       # Login page
├── register.html                    # Registration page
├── forgot-password.html             # Forgot password page
├── reset-password.html              # Reset password page
├── auth-callback.html               # Kinde auth callback page
├── test-auth.html                   # Authentication test page
└── AUTH_README.md                   # This documentation
```

## Next Steps

1. **Backend Integration** - Ensure all backend endpoints are implemented and tested
2. **Kinde Configuration** - Set up Kinde Auth project with proper domains and callbacks
3. **Email Service** - Configure email service for password reset functionality
4. **Testing** - Comprehensive testing of all authentication flows
5. **Security Review** - Security audit of authentication implementation
6. **Documentation** - User-facing documentation for authentication features

## Support

For issues or questions regarding the authentication system:

1. Check the test page (`test-auth.html`) for connectivity issues
2. Review browser console for detailed error messages
3. Verify backend API endpoints are running and accessible
4. Ensure Kinde Auth configuration matches frontend settings
