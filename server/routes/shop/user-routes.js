const express = require('express');
const router = express.Router();

// Import controllers
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  getUserStats,
  deleteAccount
} = require('../../controllers/shop/user-controller');

// Import middleware
const { authenticateToken } = require('../../middleware/auth-middleware');
const { validateObjectId } = require('../../middleware/resource-middleware');
const { 
  validateProfileUpdate, 
  validatePasswordChange,
  handleValidationErrors 
} = require('../../middleware/validation-middleware');
const { uploadAvatar: uploadAvatarMiddleware, handleMulterError } = require('../../helpers/upload-middleware');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/user/profile - Get user profile
router.get('/profile', getProfile);

// PUT /api/user/profile - Update user profile
router.put('/profile',
  validateProfileUpdate,
  handleValidationErrors,
  updateProfile
);

// PUT /api/user/change-password - Change password
router.put('/change-password',
  validatePasswordChange,
  handleValidationErrors,
  changePassword
);

// POST /api/user/upload-avatar - Upload profile picture
router.post('/upload-avatar',
  uploadAvatarMiddleware,
  handleMulterError,
  uploadAvatar
);

// GET /api/user/stats - Get user statistics
router.get('/stats', getUserStats);

// DELETE /api/user/delete-account - Delete user account
router.delete('/delete-account', deleteAccount);

module.exports = router;
