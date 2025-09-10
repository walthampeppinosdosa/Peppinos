import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAlert } from '@/hooks/useAlert';
import {
  fetchReportAnalytics,
  fetchReportData,
  fetchRecentReports,
  setFilters,
  setSelectedReportType,
  setDateRange,
  clearReportData,
  resetFilters
} from '@/store/slices/reportsSlice';
import { formatters } from '@/utils/exportUtils';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Eye,
  Leaf,
  Utensils
} from 'lucide-react';

export const Reports: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: currentUser, isSuperAdmin, canManageVeg, canManageNonVeg } = useAuth();
  const { showAlert } = useAlert();

  // Reports state
  const {
    analytics,
    reportData,
    recentReports,
    filters,
    selectedReportType,
    dateRange,
    isLoading,
    isExporting,
    error
  } = useAppSelector((state) => state.reports);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Determine available categories based on user role
  const getAvailableCategories = () => {
    if (isSuperAdmin()) {
      return [
        { value: 'all', label: 'All Categories' },
        { value: 'veg', label: 'Vegetarian' },
        { value: 'non-veg', label: 'Non-Vegetarian' }
      ];
    } else if (canManageVeg()) {
      return [{ value: 'veg', label: 'Vegetarian' }];
    } else if (canManageNonVeg()) {
      return [{ value: 'non-veg', label: 'Non-Vegetarian' }];
    }
    return [{ value: 'all', label: 'All Categories' }];
  };

  // Get role-based default category
  const getDefaultCategory = () => {
    if (canManageVeg() && !isSuperAdmin()) return 'veg';
    if (canManageNonVeg() && !isSuperAdmin()) return 'non-veg';
    return 'all';
  };

  // Initialize filters based on user role
  useEffect(() => {
    const defaultCategory = getDefaultCategory();
    dispatch(setFilters({
      category: defaultCategory,
      period: '30d',
      search: ''
    }));
  }, [dispatch, currentUser?.role]);

  // Fetch analytics when filters change
  useEffect(() => {
    if (filters.category) {
      dispatch(fetchReportAnalytics({
        filters,
        userRole: currentUser?.role
      }));
    }
  }, [dispatch, filters, currentUser?.role]);

  // Fetch recent reports on mount
  useEffect(() => {
    dispatch(fetchRecentReports());
  }, [dispatch]);

  // Event handlers
  const handlePeriodChange = (period: string) => {
    dispatch(setFilters({ ...filters, period }));
  };

  const handleCategoryChange = (category: string) => {
    dispatch(setFilters({ ...filters, category }));
  };

  const handleDateRangeChange = (range: DateRange) => {
    const serializedRange = {
      from: range.from ? range.from.toISOString() : null,
      to: range.to ? range.to.toISOString() : null
    };
    dispatch(setDateRange(serializedRange));

    if (range.from && range.to) {
      dispatch(setFilters({
        ...filters,
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString(),
        period: undefined // Clear period when using custom range
      }));
    } else {
      dispatch(setFilters({
        ...filters,
        startDate: undefined,
        endDate: undefined,
        period: filters.period || '30d'
      }));
    }
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    dispatch(setFilters({ ...filters, search }));
  };

  const handleReportTypeChange = (type: 'sales' | 'orders' | 'menu' | 'customers' | 'analytics') => {
    dispatch(setSelectedReportType(type));
    if (type !== 'analytics') {
      dispatch(fetchReportData({ type, filters }));
    }
  };


  const handleRefresh = () => {
    if (selectedReportType === 'analytics') {
      dispatch(fetchReportAnalytics({ filters, userRole: currentUser?.role }));
    } else {
      dispatch(fetchReportData({ type: selectedReportType, filters }));
    }
    dispatch(fetchRecentReports());
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    dispatch(resetFilters());
    const defaultCategory = getDefaultCategory();
    dispatch(setFilters({
      category: defaultCategory,
      period: '30d',
      search: ''
    }));
  };

  // Get report cards based on analytics data
  const getReportCards = () => {
    if (!analytics?.overview) return [];

    const cards = [
      {
        title: 'Total Revenue',
        description: 'Revenue and sales analytics',
        icon: DollarSign,
        value: `$${analytics.overview.totalRevenue.toLocaleString()}`,
        change: `${analytics.overview.growthRate >= 0 ? '+' : ''}${analytics.overview.growthRate.toFixed(1)}%`,
        trend: analytics.overview.growthRate >= 0 ? 'up' : 'down',
        color: 'text-green-600'
      },
      {
        title: 'Total Orders',
        description: 'Order volume and trends',
        icon: ShoppingCart,
        value: analytics.overview.totalOrders.toString(),
        change: '+8.2%', // This would be calculated from previous period
        trend: 'up',
        color: 'text-blue-600'
      },
      {
        title: 'Total Customers',
        description: 'Customer base analytics',
        icon: Users,
        value: analytics.overview.totalCustomers.toString(),
        change: '+15.3%', // This would be calculated from previous period
        trend: 'up',
        color: 'text-purple-600'
      },
      {
        title: 'Menu Items',
        description: 'Active menu items',
        icon: Package,
        value: analytics.overview.totalMenuItems.toString(),
        change: '+5.1%', // This would be calculated from previous period
        trend: 'up',
        color: 'text-orange-600'
      }
    ];

    // Add average order value for super admin
    if (isSuperAdmin()) {
      cards.push({
        title: 'Avg Order Value',
        description: 'Average order amount',
        icon: BarChart3,
        value: `$${analytics.overview.averageOrderValue.toFixed(2)}`,
        change: '+3.2%',
        trend: 'up',
        color: 'text-indigo-600'
      });
    }

    return cards;
  };

  // Get detailed reports based on user role
  const getDetailedReports = () => {
    const baseReports = [
      {
        title: 'Sales Analytics',
        description: 'Detailed sales breakdown and trends',
        icon: BarChart3,
        type: 'sales' as const,
        available: true
      },
      {
        title: 'Order Analytics',
        description: 'Order patterns and customer behavior',
        icon: LineChart,
        type: 'orders' as const,
        available: true
      },
      {
        title: 'Menu Performance',
        description: 'Best and worst performing menu items',
        icon: PieChart,
        type: 'menu' as const,
        available: true
      },
      {
        title: 'Customer Insights',
        description: 'Customer demographics and preferences',
        icon: Activity,
        type: 'customers' as const,
        available: isSuperAdmin() // Only super admin can see customer reports
      }
    ];

    return baseReports.filter(report => report.available);
  };

  // Export columns configuration for different report types
  const getExportColumns = (type: string) => {
    switch (type) {
      case 'sales':
      case 'orders':
        return [
          { key: 'orderNumber', label: 'Order #', width: 20 },
          { key: 'customerInfo.name', label: 'Customer', width: 25 },
          { key: 'customerInfo.email', label: 'Email', width: 30 },
          { key: 'status', label: 'Status', width: 15, formatter: formatters.status },
          { key: 'totalAmount', label: 'Amount', width: 15, formatter: formatters.currency },
          { key: 'createdAt', label: 'Date', width: 20, formatter: formatters.date }
        ];
      case 'menu':
        return [
          { key: 'name', label: 'Name', width: 30 },
          { key: 'category.name', label: 'Category', width: 20 },
          { key: 'isVegetarian', label: 'Type', width: 15, formatter: formatters.vegetarian },
          { key: 'mrp', label: 'MRP', width: 15, formatter: formatters.currency },
          { key: 'discountedPrice', label: 'Price', width: 15, formatter: formatters.currency },
          { key: 'quantity', label: 'Stock', width: 10 },
          { key: 'isActive', label: 'Status', width: 15, formatter: formatters.status }
        ];
      case 'customers':
        return [
          { key: 'name', label: 'Name', width: 25 },
          { key: 'email', label: 'Email', width: 30 },
          { key: 'phoneNumber', label: 'Phone', width: 20 },
          { key: 'isActive', label: 'Status', width: 15, formatter: formatters.status },
          { key: 'createdAt', label: 'Joined Date', width: 20, formatter: formatters.date }
        ];
      default:
        return [];
    }
  };

  // Loading state
  if (isLoading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading reports</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const reportCards = getReportCards();
  const detailedReports = getDetailedReports();
  const availableCategories = getAvailableCategories();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin()
              ? 'Comprehensive business reports and analytics'
              : `${canManageVeg() ? 'Vegetarian' : 'Non-Vegetarian'} reports and analytics`
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <Select value={filters.period || ''} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter - Only for Super Admin */}
          {isSuperAdmin() && (
            <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date Range Picker */}
          <DateRangePicker
            value={{
              from: dateRange.from ? new Date(dateRange.from) : undefined,
              to: dateRange.to ? new Date(dateRange.to) : undefined
            }}
            onChange={handleDateRangeChange}
            className="w-[280px] h-9"
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Reset Filters */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-9"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Veg/Non-Veg Breakdown for Super Admin */}
      {isSuperAdmin() && analytics?.vegNonVegBreakdown && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vegetarian Performance</CardTitle>
              <Leaf className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.vegNonVegBreakdown.veg.revenue.toLocaleString()}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="text-green-500">
                  {analytics.vegNonVegBreakdown.veg.percentage.toFixed(1)}%
                </span>
                <span className="ml-1">of total revenue</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.vegNonVegBreakdown.veg.orders} orders • {analytics.vegNonVegBreakdown.veg.menuItems} items
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non-Vegetarian Performance</CardTitle>
              <Utensils className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.vegNonVegBreakdown.nonVeg.revenue.toLocaleString()}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="text-red-500">
                  {analytics.vegNonVegBreakdown.nonVeg.percentage.toFixed(1)}%
                </span>
                <span className="ml-1">of total revenue</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.vegNonVegBreakdown.nonVeg.orders} orders • {analytics.vegNonVegBreakdown.nonVeg.menuItems} items
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {reportCards.map((card, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {card.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={card.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                  {card.change}
                </span>
                <span className="ml-1">from last period</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Reports Tabs */}
      <Tabs value={selectedReportType} onValueChange={handleReportTypeChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          {isSuperAdmin() && <TabsTrigger value="customers">Customers</TabsTrigger>}
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Comprehensive business analytics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {detailedReports.map((report, index) => (
                  <Card key={index} className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <report.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                            <CardDescription className="text-sm">{report.description}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleReportTypeChange(report.type)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View {report.title}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tabs for Sales, Orders, Menu, Customers */}
        {['sales', 'orders', 'menu', 'customers'].map((tabType) => (
          <TabsContent key={tabType} value={tabType} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="capitalize">{tabType} Report</CardTitle>
                    <CardDescription>
                      {tabType === 'sales' && 'Sales data and revenue analytics'}
                      {tabType === 'orders' && 'Order history and patterns'}
                      {tabType === 'menu' && 'Menu item performance and analytics'}
                      {tabType === 'customers' && 'Customer data and insights'}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={`Search ${tabType}...`}
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 w-[250px]"
                      />
                    </div>

                    {/* Status Filter */}
                    {(tabType === 'orders' || tabType === 'menu' || tabType === 'customers') && (
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {tabType === 'orders' && (
                            <>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </>
                          )}
                          {(tabType === 'menu' || tabType === 'customers') && (
                            <>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Export Dropdown */}
                    <ExportDropdown
                      data={Array.isArray(reportData) ? reportData : []}
                      columns={getExportColumns(tabType)}
                      filename={`${tabType}-report`}
                      title={`${tabType.charAt(0).toUpperCase() + tabType.slice(1)} Report`}
                      subtitle={`Total items: ${Array.isArray(reportData) ? reportData.length : 0}`}
                      disabled={isLoading || !Array.isArray(reportData) || reportData.length === 0}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !Array.isArray(reportData) || reportData.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No {tabType} data found for the selected filters</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {Array.isArray(reportData) ? reportData.length : 0} {tabType} records
                    </div>

                    {/* Data Table - This would be a proper data table component in a real app */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              {getExportColumns(tabType).map((col) => (
                                <th key={col.key} className="text-left p-3 font-medium text-sm">
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(Array.isArray(reportData) ? reportData : []).slice(0, 50).map((item, index) => (
                              <tr key={item._id || index} className="border-t hover:bg-muted/25">
                                {getExportColumns(tabType).map((col) => (
                                  <td key={col.key} className="p-3 text-sm">
                                    {col.formatter
                                      ? col.formatter(getNestedValue(item, col.key), item)
                                      : getNestedValue(item, col.key) || '-'
                                    }
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {Array.isArray(reportData) && reportData.length > 50 && (
                      <p className="text-sm text-muted-foreground text-center">
                        Showing first 50 records. Export to see all data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Recent Reports Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Report Activity</CardTitle>
          <CardDescription>Latest generated reports and downloads</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent reports found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReports.map((report, index) => (
                <div key={report.id || index} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/25 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{report.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.format} • {report.size} • Generated by {report.generatedBy}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to get nested object values
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};
