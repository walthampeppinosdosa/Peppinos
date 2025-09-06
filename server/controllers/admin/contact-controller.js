const Contact = require('../../models/Contact');
const Feedback = require('../../models/Feedback');
const { sendEmail } = require('../../utils/email');
const { validationResult } = require('express-validator');

/**
 * Get all contact messages
 * GET /api/admin/contacts
 */
const getAllContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      priority = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Priority filter
    if (priority) {
      query.priority = priority;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const contacts = await Contact.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Contact messages retrieved successfully',
      data: {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact messages',
      error: error.message
    });
  }
};

/**
 * Get single contact message by ID
 * GET /api/admin/contacts/:id
 */
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id).lean();
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact message retrieved successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact message',
      error: error.message
    });
  }
};

/**
 * Update contact status and priority
 * PUT /api/admin/contacts/:id
 */
const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes } = req.body;

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    // Update fields if provided
    if (status) contact.status = status;
    if (priority) contact.priority = priority;
    if (adminNotes) contact.adminNotes = adminNotes;

    contact.updatedAt = new Date();
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Contact message updated successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact message',
      error: error.message
    });
  }
};

/**
 * Reply to contact message
 * POST /api/admin/contacts/:id/reply
 */
const replyToContact = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { replyMessage } = req.body;

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    // Send reply email
    await sendEmail({
      to: contact.email,
      subject: `Re: ${contact.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">Peppino's Restaurant</h2>
          <p>Dear ${contact.name},</p>
          <p>Thank you for contacting us. Here's our response to your inquiry:</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #d32f2f;">
            <strong>Your Message:</strong><br>
            ${contact.message}
          </div>
          <div style="margin: 20px 0;">
            <strong>Our Response:</strong><br>
            ${replyMessage}
          </div>
          <p>If you have any further questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Peppino's Restaurant Team</p>
        </div>
      `
    });

    // Update contact status
    contact.status = 'resolved';
    contact.replyMessage = replyMessage;
    contact.repliedAt = new Date();
    contact.repliedBy = req.user._id;
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      data: { contact }
    });
  } catch (error) {
    console.error('Reply to contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};

/**
 * Delete contact message
 * DELETE /api/admin/contacts/:id
 */
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact message deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact message',
      error: error.message
    });
  }
};

/**
 * Get all feedback
 * GET /api/admin/feedback
 */
const getAllFeedback = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      rating = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Rating filter
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const feedback = await Feedback.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Feedback.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Feedback retrieved successfully',
      data: {
        feedback,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback',
      error: error.message
    });
  }
};

/**
 * Get contact and feedback statistics
 * GET /api/admin/contacts/stats
 */
const getContactStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get contact statistics
    const [
      totalContacts,
      pendingContacts,
      resolvedContacts,
      newContacts,
      totalFeedback,
      averageFeedbackRating
    ] = await Promise.all([
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'pending' }),
      Contact.countDocuments({ status: 'resolved' }),
      Contact.countDocuments({ createdAt: { $gte: startDate } }),
      Feedback.countDocuments({ createdAt: { $gte: startDate } }),
      Feedback.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ])
    ]);

    // Get contact trend
    const contactTrend = await Contact.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get feedback by type
    const feedbackByType = await Feedback.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Contact statistics retrieved successfully',
      data: {
        overview: {
          totalContacts,
          pendingContacts,
          resolvedContacts,
          newContacts,
          totalFeedback,
          averageFeedbackRating: averageFeedbackRating[0]?.avg || 0
        },
        contactTrend,
        feedbackByType,
        period
      }
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllContacts,
  getContactById,
  updateContact,
  replyToContact,
  deleteContact,
  getAllFeedback,
  getContactStats
};
