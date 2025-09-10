const { body, validationResult } = require('express-validator');

/**
 * Validation rules for user registration
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number')
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for Google OAuth
 */
const validateGoogleAuth = [
  body('googleId')
    .notEmpty()
    .withMessage('Google ID is required'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('profileImage')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL')
];

/**
 * Validation rules for updating profile
 */
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('profileImage')
    .optional()
    .isURL()
    .withMessage('Profile image must be a valid URL')
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

/**
 * Validation rules for menu item creation/update
 */
const validateMenuItem = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Menu item name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Menu item name must be between 2 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Menu item description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('mrp')
    .isFloat({ min: 0 })
    .withMessage('MRP must be a positive number'),

  body('discountedPrice')
    .isFloat({ min: 0 })
    .withMessage('Discounted price must be a positive number')
    .custom((value, { req }) => {
      const discountedPrice = parseFloat(value);
      const mrp = parseFloat(req.body.mrp);

      if (discountedPrice > mrp) {
        throw new Error('Discounted price cannot be greater than MRP');
      }
      return true;
    }),

  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),

  body('preparationTime')
    .isInt({ min: 1, max: 120 })
    .withMessage('Preparation time must be between 1 and 120 minutes'),

  body('preparation')
    .optional()
    .custom((value) => {
      if (!value) return true;

      // Handle case where value might be an array of values (from duplicate fields)
      let preparations;
      if (Array.isArray(value)) {
        // If it's an array, take the last value (most recent)
        const lastValue = value[value.length - 1];
        try {
          preparations = typeof lastValue === 'string' ? JSON.parse(lastValue) : lastValue;
        } catch (error) {
          throw new Error('Preparation must be valid JSON array');
        }
      } else {
        try {
          preparations = typeof value === 'string' ? JSON.parse(value) : value;
        } catch (error) {
          throw new Error('Preparation must be valid JSON array');
        }
      }

      if (!Array.isArray(preparations)) {
        throw new Error('Preparation must be an array');
      }

      // Validate each preparation ID
      for (const prepId of preparations) {
        if (!/^[0-9a-fA-F]{24}$/.test(prepId)) {
          throw new Error('Each preparation must be a valid ObjectId');
        }
      }

      return true;
    }),

  body('isVegetarian')
    .isBoolean()
    .withMessage('Vegetarian status must be a boolean'),

  body('sizes')
    .optional()
    .isArray()
    .withMessage('Sizes must be an array')
    .custom((sizes) => {
      // Check if sizes is an array of objects with required properties
      if (!Array.isArray(sizes)) {
        throw new Error('Sizes must be an array');
      }

      for (const size of sizes) {
        if (typeof size !== 'object' || !size.name || typeof size.price !== 'number') {
          throw new Error('Each size must have name and price properties');
        }

        const validSizeNames = ['Small', 'Medium', 'Large', 'Reg', 'Regular'];
        if (!validSizeNames.includes(size.name)) {
          throw new Error(`Invalid size name: ${size.name}`);
        }

        if (size.price < 0) {
          throw new Error('Size price cannot be negative');
        }
      }

      return true;
    }),

  body('spicyLevel')
    .optional()
    .custom((value) => {
      // Allow empty string or empty array
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) return true;

      // Handle JSON string (from FormData)
      if (typeof value === 'string' && value.startsWith('[')) {
        try {
          const parsedArray = JSON.parse(value);
          if (Array.isArray(parsedArray)) {
            for (const level of parsedArray) {
              // Allow 'not-applicable' string
              if (level === 'not-applicable') continue;
              // Check if it's a valid MongoDB ObjectId
              if (!/^[0-9a-fA-F]{24}$/.test(level)) {
                throw new Error('Spicy level must be a valid ObjectId');
              }
            }
            return true;
          }
        } catch (error) {
          throw new Error('Invalid spicy level format');
        }
      }

      // Handle array of spicy levels
      if (Array.isArray(value)) {
        for (const level of value) {
          // Allow 'not-applicable' string
          if (level === 'not-applicable') continue;
          // Check if it's a valid MongoDB ObjectId
          if (!/^[0-9a-fA-F]{24}$/.test(level)) {
            throw new Error('Spicy level must be a valid ObjectId');
          }
        }
        return true;
      }

      // Handle single spicy level (backward compatibility)
      if (value === 'not-applicable') return true;
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Spicy level must be a valid ObjectId');
      }
      return true;
    }),

  body('addons')
    .optional()
    .isArray()
    .withMessage('Addons must be an array'),

  body('addons.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Addon name is required'),

  body('addons.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Addon price must be a positive number'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters')
];

/**
 * Validation rules for menu item creation/update (alias for validateMenuItem)
 */
const validateProduct = validateMenuItem;

/**
 * Validation rules for bulk operations
 */
const validateBulkOperation = [
  body('menuItemIds')
    .isArray({ min: 1 })
    .withMessage('Menu item IDs array is required and must not be empty'),

  body('menuItemIds.*')
    .isMongoId()
    .withMessage('Invalid menu item ID'),

  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

/**
 * Validation rules for category creation/update
 */
const validateCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Category description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('isVegetarian')
    .isBoolean()
    .withMessage('Vegetarian status must be a boolean'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer')
];

/**
 * Validation rules for category bulk operations
 */
const validateCategoryBulkOperation = [
  body('categoryIds')
    .isArray({ min: 1 })
    .withMessage('Category IDs array is required and must not be empty'),

  body('categoryIds.*')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

/**
 * Validation rules for adding items to cart
 */
const validateAddToCart = [
  body('menuItemId')
    .notEmpty()
    .withMessage('Menu item ID is required')
    .isMongoId()
    .withMessage('Invalid menu item ID'),

  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),

  body('size')
    .optional()
    .isIn(['Small', 'Medium', 'Large'])
    .withMessage('Invalid size option'),

  body('addons')
    .optional()
    .isArray()
    .withMessage('Addons must be an array'),

  body('addons.*.id')
    .optional()
    .isMongoId()
    .withMessage('Invalid addon ID'),

  body('addons.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Addon quantity must be at least 1')
];

/**
 * Validation rules for updating cart item
 */
const validateUpdateCartItem = [
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10')
];

/**
 * Validation rules for address creation/update
 */
const validateAddress = [
  body('type')
    .isIn(['home', 'work', 'other'])
    .withMessage('Address type must be home, work, or other'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('phoneNumber')
    .matches(/^[+]?[1-9][\d\s\-()]{8,15}$/)
    .withMessage('Invalid phone number format'),

  body('street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),

  body('landmark')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Landmark cannot exceed 100 characters'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),

  body('pincode')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Invalid pincode format'),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value')
];

/**
 * Validation rules for guest cart operations
 */
const validateGuestAddToCart = [
  body('menuItemId')
    .isMongoId()
    .withMessage('Valid menu item ID is required'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  body('size')
    .optional()
    .isIn(['Small', 'Medium', 'Large'])
    .withMessage('Size must be Small, Medium, or Large'),
  body('addons')
    .optional()
    .isArray()
    .withMessage('Addons must be an array'),
  body('addons.*.id')
    .optional()
    .isMongoId()
    .withMessage('Valid addon ID is required'),
  body('addons.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Addon quantity must be at least 1'),
  body('specialInstructions')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Special instructions cannot exceed 200 characters')
];

const validateGuestUpdateCartItem = [
  body('quantity')
    .isInt({ min: 0, max: 10 })
    .withMessage('Quantity must be between 0 and 10')
];

const validateGuestCheckout = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('customer.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Customer name must be between 2 and 50 characters'),
  body('customer.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('customer.phoneNumber')
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Valid phone number is required'),
  body('orderType')
    .isIn(['pickup', 'delivery'])
    .withMessage('Order type must be pickup or delivery'),
  body('timing')
    .isIn(['asap', 'scheduled'])
    .withMessage('Timing must be asap or scheduled'),
  body('scheduledDate')
    .if(body('timing').equals('scheduled'))
    .isISO8601()
    .withMessage('Valid scheduled date is required for scheduled orders'),
  body('scheduledTime')
    .if(body('timing').equals('scheduled'))
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Scheduled time must be in HH:MM format'),
  body('deliveryAddress.street')
    .if(body('orderType').equals('delivery'))
    .trim()
    .notEmpty()
    .withMessage('Street address is required for delivery orders'),
  body('deliveryAddress.city')
    .if(body('orderType').equals('delivery'))
    .trim()
    .notEmpty()
    .withMessage('City is required for delivery orders'),
  body('deliveryAddress.state')
    .if(body('orderType').equals('delivery'))
    .trim()
    .notEmpty()
    .withMessage('State is required for delivery orders'),
  body('deliveryAddress.zipCode')
    .if(body('orderType').equals('delivery'))
    .trim()
    .notEmpty()
    .withMessage('ZIP code is required for delivery orders'),
  body('deliveryAddress.country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty if provided'),
  body('paymentMethod')
    .isIn(['pay_online', 'pay_in_store'])
    .withMessage('Payment method must be pay_online or pay_in_store'),
  body('specialInstructions')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters')
];

/**
 * Validation rules for forgot password
 */
const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

/**
 * Validation rules for reset password
 */
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  validateUpdateProfile,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword,
  validateProduct,
  validateMenuItem,
  validateBulkOperation,
  validateCategory,
  validateCategoryBulkOperation,
  validateAddToCart,
  validateUpdateCartItem,
  validateAddress,
  validateGuestAddToCart,
  validateGuestUpdateCartItem,
  validateGuestCheckout,
  handleValidationErrors
};
