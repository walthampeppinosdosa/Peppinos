const express = require('express');
const router = express.Router();

// Placeholder routes - will be implemented in Reviews & User Management task

// POST /api/shop/reviews
router.post('/reviews', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Create review endpoint not implemented yet'
  });
});

// GET /api/shop/reviews/:menuId
router.get('/reviews/:menuId', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Get menu reviews endpoint not implemented yet'
  });
});

// POST /api/shop/newsletter
router.post('/newsletter', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Newsletter signup endpoint not implemented yet'
  });
});

// POST /api/shop/contact
router.post('/contact', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Contact form endpoint not implemented yet'
  });
});

// POST /api/shop/feedback
router.post('/feedback', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Feedback form endpoint not implemented yet'
  });
});

module.exports = router;
