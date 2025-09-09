const Order = require('../../models/Order');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

/**
 * Get all orders (both regular and guest) with filtering and pagination
 * GET /api/admin/orders
 */
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      paymentStatus = '',
      deliveryStatus = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Search filter (by order number, user name, or email)
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = users.map(user => user._id);

      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { user: { $in: userIds } }
      ];
    }

    // Status filters
    if (status) {
      query.status = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (deliveryStatus) {
      query.deliveryStatus = deliveryStatus;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('user', 'name email phoneNumber role sessionId')
      .populate('items.menu', 'name images discountedPrice')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Add customer type information to orders
    const ordersWithCustomerType = orders.map(order => ({
      ...order,
      customerType: order.user?.role === 'guest' ? 'guest' : 'registered',
      isGuestOrder: order.user?.role === 'guest'
    }));

    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders: ordersWithCustomerType,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
};

/**
 * Get single order by ID
 * GET /api/admin/orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const order = req.order; // Loaded by middleware

    // Add customer type information
    const orderWithCustomerType = {
      ...order.toObject(),
      customerType: order.user?.role === 'guest' ? 'guest' : 'registered',
      isGuestOrder: order.user?.role === 'guest'
    };

    res.status(200).json({
      success: true,
      message: 'Order retrieved successfully',
      data: { order: orderWithCustomerType }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
      error: error.message
    });
  }
};

/**
 * Update order status
 * PUT /api/admin/orders/:id/status
 */
const updateOrderStatus = async (req, res) => {
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

    const order = req.order; // Loaded by middleware
    const { status, deliveryStatus, notes } = req.body;

    // Update order status
    if (status !== undefined) {
      order.status = status;
    }
    if (deliveryStatus !== undefined) {
      order.deliveryStatus = deliveryStatus;
    }

    // Add status update to history
    const statusUpdate = {
      status: status || order.status,
      deliveryStatus: deliveryStatus || order.deliveryStatus,
      updatedBy: req.user._id,
      notes: notes || '',
      timestamp: new Date()
    };

    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push(statusUpdate);

    // Update timestamps based on status
    if (status === 'confirmed') {
      order.confirmedAt = new Date();
    } else if (status === 'preparing') {
      order.preparingAt = new Date();
    } else if (status === 'ready') {
      order.readyAt = new Date();
    } else if (status === 'completed') {
      order.completedAt = new Date();
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
    }

    if (deliveryStatus === 'out_for_delivery') {
      order.outForDeliveryAt = new Date();
    } else if (deliveryStatus === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Populate for response
    await order.populate('user', 'name email phoneNumber');
    await order.populate('items.menu', 'name images discountedPrice');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Get order statistics
 * GET /api/admin/orders/stats
 */
const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get overall statistics
    const stats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          preparingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'preparing'] }, 1, 0] }
          },
          readyOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get daily revenue for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top menus
    const topMenus = await Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menu',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'menus',
          localField: '_id',
          foreignField: '_id',
          as: 'menu'
        }
      },
      { $unwind: '$menu' },
      {
        $project: {
          menuName: '$menu.name',
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      message: 'Order statistics retrieved successfully',
      data: {
        overview: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          confirmedOrders: 0,
          preparingOrders: 0,
          readyOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          paidOrders: 0,
          pendingPayments: 0
        },
        dailyRevenue,
        topMenus
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order statistics',
      error: error.message
    });
  }
};

/**
 * Export orders to CSV
 * GET /api/admin/orders/export
 */
const exportOrders = async (req, res) => {
  try {
    const { startDate, endDate, status, format = 'csv' } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phoneNumber')
      .populate('items.menu', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Order Number',
        'Customer Name',
        'Customer Email',
        'Phone',
        'Status',
        'Payment Status',
        'Delivery Status',
        'Total Amount',
        'Items',
        'Order Date',
        'Delivery Address'
      ];

      const csvRows = orders.map(order => [
        order.orderNumber,
        order.user?.name || 'N/A',
        order.user?.email || 'N/A',
        order.user?.phoneNumber || 'N/A',
        order.status,
        order.paymentStatus,
        order.deliveryStatus,
        order.totalAmount,
        order.items.map(item => `${item.menu?.name || 'Unknown'} (${item.quantity})`).join('; '),
        order.createdAt.toISOString().split('T')[0],
        order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : 'N/A'
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON format
      res.status(200).json({
        success: true,
        message: 'Orders exported successfully',
        data: { orders }
      });
    }
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export orders',
      error: error.message
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  exportOrders
};
