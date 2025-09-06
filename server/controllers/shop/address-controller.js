const Address = require('../../models/Address');
const { validationResult } = require('express-validator');

/**
 * Get all user addresses
 * GET /api/shop/addresses
 */
const getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: { addresses }
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve addresses',
      error: error.message
    });
  }
};

/**
 * Get single address by ID
 * GET /api/shop/addresses/:id
 */
const getAddressById = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      user: req.user._id
    }).lean();

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Address retrieved successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve address',
      error: error.message
    });
  }
};

/**
 * Create new address
 * POST /api/shop/addresses
 */
const createAddress = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      type,
      name,
      phoneNumber,
      street,
      landmark,
      city,
      state,
      pincode,
      isDefault = false
    } = req.body;

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id },
        { isDefault: false }
      );
    }

    // If this is the first address, make it default
    const existingAddressCount = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = isDefault || existingAddressCount === 0;

    const address = new Address({
      user: req.user._id,
      type,
      name,
      phoneNumber,
      street,
      landmark,
      city,
      state,
      pincode,
      isDefault: shouldBeDefault
    });

    await address.save();

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error: error.message
    });
  }
};

/**
 * Update address
 * PUT /api/shop/addresses/:id
 */
const updateAddress = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      type,
      name,
      phoneNumber,
      street,
      landmark,
      city,
      state,
      pincode,
      isDefault
    } = req.body;

    const address = await Address.findOne({
      _id: id,
      user: req.user._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other default addresses
    if (isDefault && !address.isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    // Update address fields
    if (type !== undefined) address.type = type;
    if (name !== undefined) address.name = name;
    if (phoneNumber !== undefined) address.phoneNumber = phoneNumber;
    if (street !== undefined) address.street = street;
    if (landmark !== undefined) address.landmark = landmark;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) address.pincode = pincode;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message
    });
  }
};

/**
 * Delete address
 * DELETE /api/shop/addresses/:id
 */
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      user: req.user._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const wasDefault = address.isDefault;
    await Address.findByIdAndDelete(id);

    // If deleted address was default, make another address default
    if (wasDefault) {
      const nextAddress = await Address.findOne({ user: req.user._id });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message
    });
  }
};

/**
 * Set address as default
 * PUT /api/shop/addresses/:id/default
 */
const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      user: req.user._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Unset all other default addresses
    await Address.updateMany(
      { user: req.user._id, _id: { $ne: id } },
      { isDefault: false }
    );

    // Set this address as default
    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      error: error.message
    });
  }
};

/**
 * Get default address
 * GET /api/shop/addresses/default
 */
const getDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      user: req.user._id,
      isDefault: true
    }).lean();

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'No default address found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Default address retrieved successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Get default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve default address',
      error: error.message
    });
  }
};

module.exports = {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress
};
