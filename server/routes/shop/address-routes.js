const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress
} = require('../../controllers/shop/address-controller');

// Import middleware
const { authenticateToken } = require('../../middleware/auth-middleware');
const { validateObjectId } = require('../../middleware/resource-middleware');
const { validateAddress, handleValidationErrors } = require('../../middleware/validation-middleware');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/shop/addresses - Get all user addresses
router.get('/addresses', getAllAddresses);

// GET /api/shop/addresses/default - Get default address
router.get('/addresses/default', getDefaultAddress);

// POST /api/shop/addresses - Create new address
router.post('/addresses',
  validateAddress,
  handleValidationErrors,
  createAddress
);

// GET /api/shop/addresses/:id - Get single address
router.get('/addresses/:id',
  validateObjectId('id'),
  getAddressById
);

// PUT /api/shop/addresses/:id - Update address
router.put('/addresses/:id',
  validateObjectId('id'),
  validateAddress,
  handleValidationErrors,
  updateAddress
);

// DELETE /api/shop/addresses/:id - Delete address
router.delete('/addresses/:id',
  validateObjectId('id'),
  deleteAddress
);

// PUT /api/shop/addresses/:id/default - Set address as default
router.put('/addresses/:id/default',
  validateObjectId('id'),
  setDefaultAddress
);

module.exports = router;
