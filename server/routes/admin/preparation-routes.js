const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Import controllers
const {
  getAllPreparations,
  getPreparationsByCategory,
  createPreparation,
  updatePreparation,
  deletePreparation
} = require('../../controllers/admin/preparation-controller');

// Import middleware
const { authenticateToken, requireAdmin } = require('../../middleware/auth-middleware');
const { handleValidationErrors } = require('../../middleware/validation-middleware');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Validation rules
const preparationValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('parentCategory')
    .isMongoId()
    .withMessage('Valid parent category ID is required'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
];

const updatePreparationValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
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
 * @route   GET /api/admin/preparations
 * @desc    Get all preparations with filtering and pagination
 * @access  Admin
 */
router.get('/', getAllPreparations);

/**
 * @route   GET /api/admin/preparations/by-category/:parentCategoryId
 * @desc    Get preparations by parent category
 * @access  Admin
 */
router.get('/by-category/:parentCategoryId', getPreparationsByCategory);

/**
 * @route   POST /api/admin/preparations
 * @desc    Create new preparation
 * @access  Admin
 */
router.post('/', preparationValidation, handleValidationErrors, createPreparation);

/**
 * @route   PUT /api/admin/preparations/:id
 * @desc    Update preparation
 * @access  Admin
 */
router.put('/:id', updatePreparationValidation, handleValidationErrors, updatePreparation);

/**
 * @route   DELETE /api/admin/preparations/:id
 * @desc    Delete preparation
 * @access  Admin
 */
router.delete('/:id', deletePreparation);

module.exports = router;
