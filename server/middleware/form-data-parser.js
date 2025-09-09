/**
 * Middleware to parse JSON strings in form data
 * This is needed when sending arrays/objects as JSON strings in multipart/form-data
 */

const parseFormDataJSON = (req, res, next) => {
  try {
    // Fields that should be parsed as JSON
    const jsonFields = ['tags', 'sizes', 'addons', 'nutritionalInfo'];
    
    jsonFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (error) {
          console.warn(`Failed to parse ${field} as JSON:`, error.message);
          // Keep the original value if parsing fails
        }
      }
    });
    
    next();
  } catch (error) {
    console.error('Error in parseFormDataJSON middleware:', error);
    next(error);
  }
};

module.exports = {
  parseFormDataJSON
};
