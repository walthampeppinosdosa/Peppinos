const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string|Buffer} fileData - Path to the file, base64 string, or buffer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise} - Cloudinary upload result
 */
const uploadToCloudinary = async (fileData, folder = 'peppinos') => {
  try {
    let uploadData;

    // Handle different input types
    if (Buffer.isBuffer(fileData)) {
      // Convert buffer to base64
      uploadData = `data:image/jpeg;base64,${fileData.toString('base64')}`;
    } else {
      uploadData = fileData;
    }

    const result = await cloudinary.uploader.upload(uploadData, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise} - Cloudinary delete result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} files - Array of file paths or base64 strings
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise} - Array of upload results
 */
const uploadMultipleToCloudinary = async (files, folder = 'peppinos') => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error('Failed to upload multiple images');
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  cloudinary
};
