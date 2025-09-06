const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  googleLogin,
  logout,
  getProfile,
  refreshToken
} = require('../../controllers/auth/auth-controller');

// Import middleware
const { authenticateToken, optionalAuth } = require('../../middleware/auth-middleware');
const {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  handleValidationErrors
} = require('../../middleware/validation-middleware');

// POST /api/auth/register
router.post('/register', validateRegister, handleValidationErrors, register);

// POST /api/auth/login
router.post('/login', validateLogin, handleValidationErrors, login);

// POST /api/auth/google
router.post('/google', validateGoogleAuth, handleValidationErrors, googleLogin);

// POST /api/auth/logout
router.post('/logout', optionalAuth, logout);

// GET /api/auth/profile
router.get('/profile', authenticateToken, getProfile);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

module.exports = router;
