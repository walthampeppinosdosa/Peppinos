const Order = require('../../models/Order');
const Menu = require('../../models/Menu');
const Category = require('../../models/Category');
const User = require('../../models/User');
const Review = require('../../models/Review');
const Cart = require('../../models/Cart');
const { getRoleBasedFilter } = require('../../helpers/role-utils');

/**
 * Get comprehensive report analytics with role-based filtering
 * GET /api/admin/reports/analytics
 */
const getReportAnalytics = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate, category = 'all' } = req.query;
    const userRole = req.user.role;

    // Calculate date range
    const now = new Date();
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      
      const startDateCalc = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: startDateCalc } };
    }

    // Apply role-based filtering
    const roleFilter = getRoleBasedFilter(userRole);
    let categoryFilter = {};
    
    // Apply category filter based on user role and request
    if (userRole === 'super-admin') {
      if (category === 'veg') {
        categoryFilter = { isVegetarian: true };
      } else if (category === 'non-veg') {
        categoryFilter = { isVegetarian: false };
      }
      // 'all' means no additional filter for super-admin
    } else {
      // For veg/non-veg admins, always apply their role filter
      categoryFilter = roleFilter;
    }

    // Get overview statistics
    const [
      totalOrders,
      totalRevenue,
      totalMenuItems,
      totalCustomers,
      averageOrderValue,
      previousPeriodRevenue
    ] = await Promise.all([
      // Total orders with filters
      Order.aggregate([
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'menus',
            localField: 'items.menu',
            foreignField: '_id',
            as: 'menuDetails'
          }
        },
        { $unwind: '$menuDetails' },
        {
          $match: {
            ...dateFilter,
            paymentStatus: 'paid',
            ...(Object.keys(categoryFilter).length > 0 && {
              'menuDetails.isVegetarian': categoryFilter.isVegetarian
            })
          }
        },
        {
          $group: {
            _id: '$_id'
          }
        },
        { $count: 'total' }
      ]).then(result => result[0]?.total || 0),

      // Total revenue with filters
      Order.aggregate([
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'menus',
            localField: 'items.menu',
            foreignField: '_id',
            as: 'menuDetails'
          }
        },
        { $unwind: '$menuDetails' },
        {
          $match: {
            ...dateFilter,
            paymentStatus: 'paid',
            ...(Object.keys(categoryFilter).length > 0 && {
              'menuDetails.isVegetarian': categoryFilter.isVegetarian
            })
          }
        },
        {
          $group: {
            _id: '$_id',
            totalAmount: { $first: '$totalAmount' }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).then(result => result[0]?.total || 0),

      // Total menu items with role filter
      Menu.countDocuments({ isActive: true, ...categoryFilter }),

      // Total customers (all customers for super-admin, filtered for others)
      User.countDocuments({ 
        role: 'customer',
        ...dateFilter
      }),

      // Average order value
      Order.aggregate([
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'menus',
            localField: 'items.menu',
            foreignField: '_id',
            as: 'menuDetails'
          }
        },
        { $unwind: '$menuDetails' },
        {
          $match: {
            ...dateFilter,
            paymentStatus: 'paid',
            ...(Object.keys(categoryFilter).length > 0 && {
              'menuDetails.isVegetarian': categoryFilter.isVegetarian
            })
          }
        },
        {
          $group: {
            _id: '$_id',
            totalAmount: { $first: '$totalAmount' }
          }
        },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ]).then(result => result[0]?.avg || 0),

      // Previous period revenue for growth calculation
      Order.aggregate([
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'menus',
            localField: 'items.menu',
            foreignField: '_id',
            as: 'menuDetails'
          }
        },
        { $unwind: '$menuDetails' },
        {
          $match: {
            createdAt: {
              $gte: new Date(dateFilter.createdAt.$gte.getTime() - (now.getTime() - dateFilter.createdAt.$gte.getTime())),
              $lt: dateFilter.createdAt.$gte
            },
            paymentStatus: 'paid',
            ...(Object.keys(categoryFilter).length > 0 && {
              'menuDetails.isVegetarian': categoryFilter.isVegetarian
            })
          }
        },
        {
          $group: {
            _id: '$_id',
            totalAmount: { $first: '$totalAmount' }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).then(result => result[0]?.total || 0)
    ]);

    // Calculate growth rate
    const growthRate = previousPeriodRevenue > 0 
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : 0;

    // Get daily revenue trend
    const dailyRevenue = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menus',
          localField: 'items.menu',
          foreignField: '_id',
          as: 'menuDetails'
        }
      },
      { $unwind: '$menuDetails' },
      {
        $match: {
          ...dateFilter,
          paymentStatus: 'paid',
          ...(Object.keys(categoryFilter).length > 0 && {
            'menuDetails.isVegetarian': categoryFilter.isVegetarian
          })
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orderId: '$_id'
          },
          totalAmount: { $first: '$totalAmount' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          revenue: 1,
          orders: 1,
          _id: 0
        }
      }
    ]);

    // Get category performance
    const categoryPerformance = await Order.aggregate([
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
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $match: {
          ...dateFilter,
          paymentStatus: 'paid',
          ...categoryFilter && { 'menuItem.isVegetarian': categoryFilter.isVegetarian }
        }
      },
      {
        $group: {
          _id: '$categoryInfo.name',
          revenue: { $sum: { $multiply: ['$items.quantity', '$menuItem.discountedPrice'] } },
          orders: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          category: '$_id',
          revenue: 1,
          orders: 1,
          _id: 0
        }
      }
    ]);

    // Get top menu items
    const topMenuItems = await Order.aggregate([
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
        $match: {
          ...dateFilter,
          paymentStatus: 'paid',
          ...categoryFilter && { 'menuItem.isVegetarian': categoryFilter.isVegetarian }
        }
      },
      {
        $group: {
          _id: '$menuItem._id',
          name: { $first: '$menuItem.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$menuItem.discountedPrice'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          quantity: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);

    // Get customer trends
    const customerTrends = await User.aggregate([
      {
        $match: {
          role: 'customer',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          newCustomers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          newCustomers: 1,
          returningCustomers: { $literal: 0 }, // Placeholder - would need more complex logic
          _id: 0
        }
      }
    ]);

    // Get veg/non-veg breakdown for super-admin
    let vegNonVegBreakdown = null;
    if (userRole === 'super-admin') {
      const [vegStats, nonVegStats] = await Promise.all([
        // Veg stats
        Promise.all([
          Order.aggregate([
            { $unwind: '$items' },
            {
              $lookup: {
                from: 'menus',
                localField: 'items.menu',
                foreignField: '_id',
                as: 'menuDetails'
              }
            },
            { $unwind: '$menuDetails' },
            {
              $match: {
                ...dateFilter,
                paymentStatus: 'paid',
                'menuDetails.isVegetarian': true
              }
            },
            {
              $group: {
                _id: '$_id',
                totalAmount: { $first: '$totalAmount' }
              }
            },
            { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }
          ]).then(result => result[0] || { revenue: 0, orders: 0 }),
          Menu.countDocuments({ isActive: true, isVegetarian: true })
        ]),
        // Non-veg stats
        Promise.all([
          Order.aggregate([
            { $unwind: '$items' },
            {
              $lookup: {
                from: 'menus',
                localField: 'items.menu',
                foreignField: '_id',
                as: 'menuDetails'
              }
            },
            { $unwind: '$menuDetails' },
            {
              $match: {
                ...dateFilter,
                paymentStatus: 'paid',
                'menuDetails.isVegetarian': false
              }
            },
            {
              $group: {
                _id: '$_id',
                totalAmount: { $first: '$totalAmount' }
              }
            },
            { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }
          ]).then(result => result[0] || { revenue: 0, orders: 0 }),
          Menu.countDocuments({ isActive: true, isVegetarian: false })
        ])
      ]);

      const totalRevenueForPercentage = vegStats[0].revenue + nonVegStats[0].revenue;
      
      vegNonVegBreakdown = {
        veg: {
          revenue: vegStats[0].revenue,
          orders: vegStats[0].orders,
          menuItems: vegStats[1],
          percentage: totalRevenueForPercentage > 0 ? (vegStats[0].revenue / totalRevenueForPercentage) * 100 : 0
        },
        nonVeg: {
          revenue: nonVegStats[0].revenue,
          orders: nonVegStats[0].orders,
          menuItems: nonVegStats[1],
          percentage: totalRevenueForPercentage > 0 ? (nonVegStats[0].revenue / totalRevenueForPercentage) * 100 : 0
        }
      };
    }

    const analytics = {
      overview: {
        totalRevenue,
        totalOrders,
        totalMenuItems,
        totalCustomers,
        averageOrderValue,
        growthRate
      },
      charts: {
        dailyRevenue,
        categoryPerformance,
        topMenuItems,
        customerTrends
      },
      ...(vegNonVegBreakdown && { vegNonVegBreakdown })
    };

    res.status(200).json({
      success: true,
      message: 'Report analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    console.error('Get report analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve report analytics',
      error: error.message
    });
  }
};

/**
 * Get report data for specific type with role-based filtering
 * GET /api/admin/reports/data
 */
const getReportData = async (req, res) => {
  try {
    const {
      type,
      period = '30d',
      startDate,
      endDate,
      category = 'all',
      search = '',
      status,
      page = 1,
      limit = 100
    } = req.query;

    const userRole = req.user.role;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Calculate date range
    const now = new Date();
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }

      const startDateCalc = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: startDateCalc } };
    }

    // Apply role-based filtering
    const roleFilter = getRoleBasedFilter(userRole);
    let categoryFilter = {};

    if (userRole === 'super-admin') {
      if (category === 'veg') {
        categoryFilter = { isVegetarian: true };
      } else if (category === 'non-veg') {
        categoryFilter = { isVegetarian: false };
      }
    } else {
      categoryFilter = roleFilter;
    }

    let data = [];
    let total = 0;

    switch (type) {
      case 'sales':
      case 'orders':
        // Get orders with menu details
        const orderMatchConditions = {
          ...dateFilter,
          ...(status && { status }),
          ...(search && {
            $or: [
              { 'customer.name': { $regex: search, $options: 'i' } },
              { 'customer.email': { $regex: search, $options: 'i' } },
              { orderNumber: { $regex: search, $options: 'i' } }
            ]
          })
        };

        const orderPipeline = [
          {
            $lookup: {
              from: 'users',
              localField: 'customer',
              foreignField: '_id',
              as: 'customerInfo'
            }
          },
          { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'menus',
              localField: 'items.menu',
              foreignField: '_id',
              as: 'menuDetails'
            }
          },
          { $unwind: '$menuDetails' },
          {
            $match: {
              ...orderMatchConditions,
              ...(Object.keys(categoryFilter).length > 0 && {
                'menuDetails.isVegetarian': categoryFilter.isVegetarian
              })
            }
          },
          {
            $group: {
              _id: '$_id',
              orderNumber: { $first: '$orderNumber' },
              status: { $first: '$status' },
              paymentStatus: { $first: '$paymentStatus' },
              totalAmount: { $first: '$totalAmount' },
              createdAt: { $first: '$createdAt' },
              customerInfo: { $first: '$customerInfo' },
              itemCount: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 1,
              orderNumber: 1,
              status: 1,
              paymentStatus: 1,
              totalAmount: 1,
              createdAt: 1,
              'customerInfo.name': 1,
              'customerInfo.email': 1,
              'customerInfo.phoneNumber': 1,
              itemCount: 1,
              type: { $literal: 'order' }
            }
          },
          { $sort: { createdAt: -1 } }
        ];

        [data, total] = await Promise.all([
          Order.aggregate([...orderPipeline, { $skip: skip }, { $limit: parseInt(limit) }]),
          Order.aggregate([...orderPipeline, { $count: 'total' }]).then(result => result[0]?.total || 0)
        ]);
        break;

      case 'menu':
        // Get menu items
        const menuMatchConditions = {
          ...categoryFilter,
          ...(search && {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          })
        };

        [data, total] = await Promise.all([
          Menu.find(menuMatchConditions)
            .populate('category', 'name')
            .select('name description category isVegetarian mrp discountedPrice quantity isActive createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
          Menu.countDocuments(menuMatchConditions)
        ]);

        // Add type field and format data
        data = data.map(item => ({
          ...item,
          type: 'menu',
          amount: item.discountedPrice,
          status: item.isActive ? 'active' : 'inactive',
          date: item.createdAt
        }));
        break;

      case 'customers':
        // Get customers (only for super-admin or filtered view)
        const customerMatchConditions = {
          role: 'customer',
          ...dateFilter,
          ...(search && {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phoneNumber: { $regex: search, $options: 'i' } }
            ]
          })
        };

        [data, total] = await Promise.all([
          User.find(customerMatchConditions)
            .select('name email phoneNumber isActive lastLogin createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
          User.countDocuments(customerMatchConditions)
        ]);

        // Add type field and format data
        data = data.map(customer => ({
          ...customer,
          type: 'customer',
          status: customer.isActive ? 'active' : 'inactive',
          date: customer.createdAt
        }));
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Supported types: sales, orders, menu, customers'
        });
    }

    res.status(200).json({
      success: true,
      message: 'Report data retrieved successfully',
      data: {
        items: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          type,
          period,
          category,
          search,
          status,
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Get report data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve report data',
      error: error.message
    });
  }
};

/**
 * Generate and download report
 * POST /api/admin/reports/generate
 */
const generateReport = async (req, res) => {
  try {
    const { type, format, filters = {}, title } = req.body;
    const userRole = req.user.role;
    const userName = req.user.name;

    if (!type || !format) {
      return res.status(400).json({
        success: false,
        message: 'Report type and format are required'
      });
    }

    // For now, we'll create mock data since we can't easily capture the response from getReportData
    const reportData = [];

    const reportTitle = title || `${type.charAt(0).toUpperCase() + type.slice(1)} Report`;
    const timestamp = new Date().toISOString();
    const filename = `${type}-report-${new Date().toISOString().split('T')[0]}`;

    // Create report info for tracking
    const reportInfo = {
      id: `${type}-${Date.now()}`,
      name: reportTitle,
      type: type,
      format: format.toUpperCase(),
      size: `${Math.round(JSON.stringify(reportData).length / 1024)} KB`,
      generatedAt: timestamp,
      generatedBy: userName
    };

    // In a real implementation, you would generate the actual file here
    // For now, we'll return the data and report info
    res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        reportData,
        reportInfo,
        downloadUrl: `/api/admin/reports/download/${reportInfo.id}`, // Placeholder URL
        filename: `${filename}.${format}`
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

/**
 * Get recent reports
 * GET /api/admin/reports/recent
 */
const getRecentReports = async (req, res) => {
  try {
    // In a real implementation, you would store report generation history in the database
    // For now, we'll return mock data
    const recentReports = [
      {
        id: 'sales-1234567890',
        name: 'Monthly Sales Report',
        type: 'sales',
        format: 'PDF',
        size: '2.4 MB',
        generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        generatedBy: req.user.name
      },
      {
        id: 'orders-1234567891',
        name: 'Order Analytics',
        type: 'orders',
        format: 'Excel',
        size: '1.8 MB',
        generatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        generatedBy: req.user.name
      },
      {
        id: 'menu-1234567892',
        name: 'Menu Performance Report',
        type: 'menu',
        format: 'CSV',
        size: '856 KB',
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        generatedBy: req.user.name
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Recent reports retrieved successfully',
      data: recentReports
    });
  } catch (error) {
    console.error('Get recent reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent reports',
      error: error.message
    });
  }
};

/**
 * Export report data (for frontend export functionality)
 * POST /api/admin/reports/export
 */
const exportReportData = async (req, res) => {
  try {
    const { data, type, format, title, filters } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Report data is required and must be an array'
      });
    }

    // In a real implementation, you would process the data and create the file
    // For now, we'll just return success
    const reportInfo = {
      id: `export-${Date.now()}`,
      name: title || `${type} Export`,
      type: type || 'export',
      format: format?.toUpperCase() || 'CSV',
      size: `${Math.round(JSON.stringify(data).length / 1024)} KB`,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name
    };

    res.status(200).json({
      success: true,
      message: 'Report exported successfully',
      data: {
        reportInfo,
        downloadUrl: `/api/admin/reports/download/${reportInfo.id}`
      }
    });
  } catch (error) {
    console.error('Export report data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report data',
      error: error.message
    });
  }
};

module.exports = {
  getReportAnalytics,
  getReportData,
  generateReport,
  getRecentReports,
  exportReportData
};
