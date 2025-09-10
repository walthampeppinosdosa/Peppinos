const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  googleLogin,
  logout,
  getProfile,
  refreshToken,
  kindeTokenExchange,
  kindeSync,
  forgotPassword,
  resetPassword,
  verifyResetToken
} = require('../../controllers/auth/auth-controller');

// Import middleware
const { authenticateToken, optionalAuth } = require('../../middleware/auth-middleware');
const {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  validateForgotPassword,
  validateResetPassword,
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

// POST /api/auth/kinde-token-exchange
router.post('/kinde-token-exchange', kindeTokenExchange);

// POST /api/auth/kinde-sync
router.post('/kinde-sync', kindeSync);

// POST /api/auth/forgot-password
router.post('/forgot-password', validateForgotPassword, handleValidationErrors, forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateResetPassword, handleValidationErrors, resetPassword);

// POST /api/auth/verify-reset-token
router.post('/verify-reset-token', verifyResetToken);

module.exports = router;
