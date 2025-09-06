const Order = require('../../models/Order');
const Menu = require('../../models/Menu');
const Category = require('../../models/Category');
const User = require('../../models/User');
const Review = require('../../models/Review');
const Cart = require('../../models/Cart');

/**
 * Get comprehensive dashboard analytics
 * GET /api/admin/dashboard/analytics
 */
const getDashboardAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range based on period
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
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get overview statistics
    const [
      totalOrders,
      totalRevenue,
      totalUsers,
      totalMenuItems,
      pendingOrders,
      completedOrders,
      activeUsers,
      averageOrderValue
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Menu.countDocuments({ isActive: true }),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed', createdAt: { $gte: startDate } }),
      User.countDocuments({ isActive: true, lastLogin: { $gte: startDate } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, paymentStatus: 'paid' } },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ])
    ]);

    // Get daily revenue trend
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
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

    // Get top selling menu items
    const topMenuItems = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
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
          as: 'menuItem'
        }
      },
      { $unwind: '$menuItem' },
      {
        $project: {
          menuItemName: '$menuItem.name',
          menuItemImage: { $arrayElemAt: ['$menuItem.images.url', 0] },
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    // Get category performance
    const categoryPerformance = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menus',
          localField: 'items.menu',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      { $unwind: '$menuItem' },
      {
        $lookup: {
          from: 'categories',
          localField: 'menuItem.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Get order status distribution
    const orderStatusDistribution = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get user registration trend
    const userRegistrationTrend = await User.aggregate([
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
      message: 'Dashboard analytics retrieved successfully',
      data: {
        overview: {
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          totalUsers,
          totalMenuItems,
          pendingOrders,
          completedOrders,
          activeUsers,
          averageOrderValue: averageOrderValue[0]?.avg || 0
        },
        charts: {
          dailyRevenue,
          userRegistrationTrend,
          orderStatusDistribution,
          categoryPerformance
        },
        topMenuItems,
        period
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard analytics',
      error: error.message
    });
  }
};

/**
 * Get cart analytics and abandonment statistics
 * GET /api/admin/dashboard/cart-analytics
 */
const getCartAnalytics = async (req, res) => {
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

    // Get cart statistics
    const [
      totalCarts,
      activeCarts,
      abandonedCarts,
      averageCartValue,
      conversionRate
    ] = await Promise.all([
      Cart.countDocuments({ updatedAt: { $gte: startDate } }),
      Cart.countDocuments({
        updatedAt: { $gte: startDate },
        'items.0': { $exists: true }
      }),
      Cart.countDocuments({
        updatedAt: { $gte: startDate },
        'items.0': { $exists: true },
        updatedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }),
      Cart.aggregate([
        { $match: { updatedAt: { $gte: startDate }, 'items.0': { $exists: true } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'menus',
            localField: 'items.menu',
            foreignField: '_id',
            as: 'menuItem'
          }
        },
        { $unwind: '$menuItem' },
        {
          $group: {
            _id: '$_id',
            cartValue: {
              $sum: { $multiply: ['$items.quantity', '$menuItem.discountedPrice'] }
            }
          }
        },
        {
          $group: {
            _id: null,
            averageValue: { $avg: '$cartValue' }
          }
        }
      ]),
      // Calculate conversion rate (orders vs carts)
      Promise.all([
        Order.countDocuments({ createdAt: { $gte: startDate } }),
        Cart.countDocuments({
          updatedAt: { $gte: startDate },
          'items.0': { $exists: true }
        })
      ]).then(([orders, carts]) => carts > 0 ? (orders / carts) * 100 : 0)
    ]);

    // Get most added to cart menu items
    const mostAddedMenuItems = await Cart.aggregate([
      { $match: { updatedAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menu',
          addedCount: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      {
        $lookup: {
          from: 'menus',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      { $unwind: '$menuItem' },
      {
        $project: {
          menuItemName: '$menuItem.name',
          menuItemImage: { $arrayElemAt: ['$menuItem.images.url', 0] },
          addedCount: 1,
          totalQuantity: 1
        }
      },
      { $sort: { addedCount: -1 } },
      { $limit: 10 }
    ]);

    // Get cart abandonment by hour
    const abandonmentByHour = await Cart.aggregate([
      {
        $match: {
          updatedAt: { $gte: startDate },
          'items.0': { $exists: true },
          updatedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $hour: '$updatedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      message: 'Cart analytics retrieved successfully',
      data: {
        overview: {
          totalCarts,
          activeCarts,
          abandonedCarts,
          averageCartValue: averageCartValue[0]?.averageValue || 0,
          conversionRate: Math.round(conversionRate * 100) / 100
        },
        mostAddedMenuItems,
        abandonmentByHour,
        period
      }
    });
  } catch (error) {
    console.error('Get cart analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart analytics',
      error: error.message
    });
  }
};

/**
 * Export comprehensive report
 * GET /api/admin/dashboard/export
 */
const exportReport = async (req, res) => {
  try {
    const {
      type = 'orders',
      format = 'csv',
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    // Calculate date range
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const now = new Date();
      let start;
      switch (period) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      dateFilter.createdAt = { $gte: start };
    }

    let data, headers, filename;

    switch (type) {
      case 'orders':
        data = await Order.find(dateFilter)
          .populate('user', 'name email phoneNumber')
          .sort({ createdAt: -1 })
          .lean();

        headers = [
          'Order Number', 'Customer Name', 'Email', 'Phone',
          'Status', 'Payment Status', 'Total Amount', 'Order Date'
        ];

        filename = `orders-report-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'menu':
        data = await Menu.find({ isActive: true })
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .lean();

        headers = [
          'Menu Item Name', 'Category', 'MRP', 'Discounted Price',
          'Quantity', 'Is Vegetarian', 'Average Rating', 'Status'
        ];

        filename = `menu-report-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'users':
        data = await User.find(dateFilter)
          .select('-password -refreshToken')
          .sort({ createdAt: -1 })
          .lean();

        headers = [
          'Name', 'Email', 'Phone', 'Role', 'Status',
          'Email Verified', 'Registration Date', 'Last Login'
        ];

        filename = `users-report-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Must be orders, menu, or users.'
        });
    }

    if (format === 'csv') {
      // Generate CSV content
      const csvRows = data.map(item => {
        switch (type) {
          case 'orders':
            return [
              item.orderNumber,
              item.user?.name || 'N/A',
              item.user?.email || 'N/A',
              item.user?.phoneNumber || 'N/A',
              item.status,
              item.paymentStatus,
              item.totalAmount,
              item.createdAt.toISOString().split('T')[0]
            ];
          case 'menu':
            return [
              item.name,
              item.category?.name || 'N/A',
              item.mrp,
              item.discountedPrice,
              item.quantity,
              item.isVegetarian ? 'Yes' : 'No',
              item.averageRating || 0,
              item.isActive ? 'Active' : 'Inactive'
            ];
          case 'users':
            return [
              item.name,
              item.email,
              item.phoneNumber || 'N/A',
              item.role,
              item.isActive ? 'Active' : 'Inactive',
              item.isEmailVerified ? 'Yes' : 'No',
              item.createdAt.toISOString().split('T')[0],
              item.lastLogin ? item.lastLogin.toISOString().split('T')[0] : 'Never'
            ];
          default:
            return [];
        }
      });

      const csvContent = [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON format
      res.status(200).json({
        success: true,
        message: 'Report exported successfully',
        data: {
          type,
          period,
          totalRecords: data.length,
          data
        }
      });
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getCartAnalytics,
  exportReport
};
