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

// Development only - Test bcrypt functionality
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-test-bcrypt', async (req, res) => {
    try {
      const bcrypt = require('bcryptjs');
      const testPassword = 'TestPassword123';

      console.log('🧪 Testing bcrypt functionality...');

      // Test 1: Basic bcrypt hash and compare
      const hash1 = await bcrypt.hash(testPassword, 12);
      const compare1 = await bcrypt.compare(testPassword, hash1);
      console.log('Test 1 - Basic bcrypt:', compare1);

      // Test 2: Different salt rounds
      const hash2 = await bcrypt.hash(testPassword, 10);
      const compare2 = await bcrypt.compare(testPassword, hash2);
      console.log('Test 2 - Salt rounds 10:', compare2);

      // Test 3: Wrong password
      const compare3 = await bcrypt.compare('WrongPassword', hash1);
      console.log('Test 3 - Wrong password:', compare3);

      res.json({
        success: true,
        message: 'Bcrypt tests completed',
        results: {
          basicTest: compare1,
          saltRounds10: compare2,
          wrongPassword: compare3,
          hash1: hash1,
          hash2: hash2
        }
      });
    } catch (error) {
      console.error('Bcrypt test error:', error);
      res.status(500).json({
        success: false,
        message: 'Bcrypt test failed',
        error: error.message
      });
    }
  });
}

module.exports = router;
