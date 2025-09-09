const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controllers
const {
  getAllSpicyLevels,
  getSpicyLevelsByCategory,
  createSpicyLevel,
  updateSpicyLevel,
  deleteSpicyLevel
} = require('../../controllers/admin/spicy-level-controller');

// Import middleware
const { authenticateToken, requireAdmin } = require('../../middleware/auth-middleware');
const { handleValidationErrors } = require('../../middleware/validation-middleware');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Validation rules
const spicyLevelValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Name must be between 1 and 30 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('level')
    .isInt({ min: 0, max: 10 })
    .withMessage('Level must be between 0 and 10'),
  body('parentCategory')
    .isMongoId()
    .withMessage('Valid parent category ID is required'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
];

const updateSpicyLevelValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Name must be between 1 and 30 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('level')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Level must be between 0 and 10'),
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Valid parent category ID is required'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Routes

/**
 * @route   GET /api/admin/spicy-levels
 * @desc    Get all spicy levels with filtering and pagination
 * @access  Admin
 */
router.get('/', getAllSpicyLevels);

/**
 * @route   GET /api/admin/spicy-levels/by-category/:parentCategoryId
 * @desc    Get spicy levels by parent category
 * @access  Admin
 */
router.get('/by-category/:parentCategoryId', getSpicyLevelsByCategory);

/**
 * @route   POST /api/admin/spicy-levels
 * @desc    Create new spicy level
 * @access  Admin
 */
router.post('/', spicyLevelValidation, handleValidationErrors, createSpicyLevel);

/**
 * @route   PUT /api/admin/spicy-levels/:id
 * @desc    Update spicy level
 * @access  Admin
 */
router.put('/:id', updateSpicyLevelValidation, handleValidationErrors, updateSpicyLevel);

/**
 * @route   DELETE /api/admin/spicy-levels/:id
 * @desc    Delete spicy level
 * @access  Admin
 */
router.delete('/:id', deleteSpicyLevel);

module.exports = router;
