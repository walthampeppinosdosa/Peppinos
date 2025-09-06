const Newsletter = require('../../models/Newsletter');
const Contact = require('../../models/Contact');
const Feedback = require('../../models/Feedback');
const { sendEmail } = require('../../utils/email');
const { validationResult } = require('express-validator');

/**
 * Get all newsletter subscribers
 * GET /api/admin/newsletter/subscribers
 */
const getSubscribers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const subscribers = await Newsletter.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Newsletter.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Newsletter subscribers retrieved successfully',
      data: {
        subscribers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscribers',
      error: error.message
    });
  }
};

/**
 * Send newsletter to subscribers
 * POST /api/admin/newsletter/send
 */
const sendNewsletter = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subject, content, recipientType = 'all' } = req.body;

    // Get subscribers based on recipient type
    let query = { isActive: true };
    if (recipientType === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { $gte: thirtyDaysAgo };
    }

    const subscribers = await Newsletter.find(query).lean();

    if (subscribers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active subscribers found'
      });
    }

    // Send emails in batches to avoid overwhelming the email service
    const batchSize = 50;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (subscriber) => {
        try {
          await sendEmail({
            to: subscriber.email,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d32f2f;">Peppino's Restaurant Newsletter</h2>
                <div style="margin: 20px 0;">
                  ${content}
                </div>
                <hr style="margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                  You're receiving this email because you subscribed to our newsletter.
                  <a href="${process.env.CLIENT_URL}/unsubscribe?email=${subscriber.email}" style="color: #d32f2f;">
                    Unsubscribe
                  </a>
                </p>
              </div>
            `
          });
          sentCount++;
        } catch (error) {
          console.error(`Failed to send email to ${subscriber.email}:`, error);
          failedCount++;
        }
      });

      await Promise.all(emailPromises);
      
      // Add delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.status(200).json({
      success: true,
      message: 'Newsletter sent successfully',
      data: {
        totalSubscribers: subscribers.length,
        sentCount,
        failedCount
      }
    });
  } catch (error) {
    console.error('Send newsletter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send newsletter',
      error: error.message
    });
  }
};

/**
 * Get newsletter statistics
 * GET /api/admin/newsletter/stats
 */
const getNewsletterStats = async (req, res) => {
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

    // Get statistics
    const [
      totalSubscribers,
      activeSubscribers,
      newSubscribers,
      unsubscribedCount
    ] = await Promise.all([
      Newsletter.countDocuments(),
      Newsletter.countDocuments({ isActive: true }),
      Newsletter.countDocuments({ createdAt: { $gte: startDate } }),
      Newsletter.countDocuments({ isActive: false })
    ]);

    // Get subscription trend
    const subscriptionTrend = await Newsletter.aggregate([
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

    res.status(200).json({
      success: true,
      message: 'Newsletter statistics retrieved successfully',
      data: {
        overview: {
          totalSubscribers,
          activeSubscribers,
          newSubscribers,
          unsubscribedCount,
          growthRate: totalSubscribers > 0 ? ((newSubscribers / totalSubscribers) * 100).toFixed(2) : 0
        },
        subscriptionTrend,
        period
      }
    });
  } catch (error) {
    console.error('Get newsletter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve newsletter statistics',
      error: error.message
    });
  }
};

/**
 * Delete subscriber
 * DELETE /api/admin/newsletter/subscribers/:id
 */
const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber = await Newsletter.findByIdAndDelete(id);
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscriber deleted successfully'
    });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscriber',
      error: error.message
    });
  }
};

/**
 * Export subscribers list
 * GET /api/admin/newsletter/export
 */
const exportSubscribers = async (req, res) => {
  try {
    const { format = 'csv', status = '' } = req.query;

    // Build query
    let query = {};
    if (status) {
      query.isActive = status === 'active';
    }

    const subscribers = await Newsletter.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      const headers = ['Email', 'Status', 'Subscription Date'];
      const csvRows = subscribers.map(subscriber => [
        subscriber.email,
        subscriber.isActive ? 'Active' : 'Inactive',
        subscriber.createdAt.toISOString().split('T')[0]
      ]);

      const csvContent = [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const filename = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } else {
      res.status(200).json({
        success: true,
        message: 'Subscribers exported successfully',
        data: {
          totalSubscribers: subscribers.length,
          subscribers
        }
      });
    }
  } catch (error) {
    console.error('Export subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export subscribers',
      error: error.message
    });
  }
};

module.exports = {
  getSubscribers,
  sendNewsletter,
  getNewsletterStats,
  deleteSubscriber,
  exportSubscribers
};
