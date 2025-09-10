import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAlert } from '@/hooks/useAlert';
import { useNavigate } from 'react-router-dom';
import {
  fetchDashboardStats,
  fetchCartAnalytics,
  exportDashboardReport,
  setSelectedPeriod,
  clearError
} from '@/store/slices/dashboardSlice';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Star,
  Activity,
  RefreshCw,
  Calendar,
  Eye,
  Plus,
  BarChart3,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Leaf,
  Utensils,
  Target,
  Zap,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  // Redux state
  const {
    stats,
    cartAnalytics,
    isLoading,
    error,
    selectedPeriod
  } = useAppSelector((state) => state.dashboard);

  // Local state
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  // Initialize dashboard data
  useEffect(() => {
    handleRefresh();
  }, [selectedPeriod]);

  // Clear error on mount
  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const params = {
        period: selectedPeriod,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString()
      };

      await Promise.all([
        dispatch(fetchDashboardStats(params)).unwrap(),
        dispatch(fetchCartAnalytics(params)).unwrap()
      ]);
    } catch (error: any) {
      showAlert(error || 'Failed to refresh dashboard data', 'error', 'Refresh Failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    dispatch(setSelectedPeriod(period));
  };

  const handleExportData = async (type: 'orders' | 'menu' | 'users', format: 'csv' | 'json' = 'csv') => {
    try {
      await dispatch(exportDashboardReport({
        type,
        format,
        period: selectedPeriod,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString()
      })).unwrap();
      showAlert('Export completed successfully!', 'success', 'Export Complete');
    } catch (error: any) {
      showAlert(error || 'Failed to export data', 'error', 'Export Failed');
    }
  };

  const handleCategoryFilterChange = (category: 'all' | 'veg' | 'non-veg') => {
    setCategoryFilter(category);
    // Refresh data with new filter
    handleRefresh();
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    // Refresh data with new date range
    handleRefresh();
  };

  const handleExportVegNonVeg = async (category: 'veg' | 'non-veg', format: 'pdf' | 'excel' | 'csv' = 'csv') => {
    try {
      // Get filtered data for export based on available dashboard data
      const categoryMenuItems = stats?.topMenuItems?.filter(item =>
        item.menuItemName.toLowerCase().includes(category === 'veg' ? 'veg' : 'non-veg')
      ) || [];

      const categoryPerformance = stats?.charts?.categoryPerformance?.filter(item =>
        item.categoryName?.toLowerCase().includes(category === 'veg' ? 'veg' : 'non-veg')
      ) || [];

      // Prepare export data combining available information
      const exportData = [
        // Overview section
        {
          'Section': 'Overview',
          'Metric': 'Total Revenue',
          'Value': `$${stats?.overview?.totalRevenue?.toFixed(2) || '0.00'}`,
          'Category': category.charAt(0).toUpperCase() + category.slice(1),
          'Period': selectedPeriod,
          'Date': new Date().toLocaleDateString()
        },
        {
          'Section': 'Overview',
          'Metric': 'Total Orders',
          'Value': stats?.overview?.totalOrders?.toString() || '0',
          'Category': category.charAt(0).toUpperCase() + category.slice(1),
          'Period': selectedPeriod,
          'Date': new Date().toLocaleDateString()
        },
        // Top menu items for this category
        ...categoryMenuItems.map(item => ({
          'Section': 'Top Menu Items',
          'Metric': item.menuItemName,
          'Value': `Qty: ${item.totalQuantity}, Revenue: $${item.totalRevenue?.toFixed(2)}`,
          'Category': category.charAt(0).toUpperCase() + category.slice(1),
          'Period': selectedPeriod,
          'Date': new Date().toLocaleDateString()
        })),
        // Category performance
        ...categoryPerformance.map(item => ({
          'Section': 'Category Performance',
          'Metric': item.categoryName,
          'Value': `Qty: ${item.totalQuantity}, Revenue: $${item.totalRevenue?.toFixed(2)}`,
          'Category': category.charAt(0).toUpperCase() + category.slice(1),
          'Period': selectedPeriod,
          'Date': new Date().toLocaleDateString()
        }))
      ];

      if (exportData.length <= 2) {
        showAlert(`No ${category} data found for the selected period`, 'warning', 'No Data');
        return;
      }

      // Use export utility
      const { exportData: exportUtil } = await import('@/utils/exportUtils');

      // Define columns for export
      const columns = [
        { key: 'Section', label: 'Section' },
        { key: 'Metric', label: 'Metric' },
        { key: 'Value', label: 'Value' },
        { key: 'Category', label: 'Category' },
        { key: 'Period', label: 'Period' },
        { key: 'Date', label: 'Date' }
      ];

      await exportUtil(format, {
        filename: `${category}-dashboard-report-${new Date().toISOString().split('T')[0]}`,
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Dashboard Report`,
        subtitle: `Generated on ${new Date().toLocaleDateString()} | Period: ${selectedPeriod}`,
        columns,
        data: exportData
      });

      showAlert(`${category.charAt(0).toUpperCase() + category.slice(1)} report exported successfully!`, 'success', 'Export Complete');
    } catch (error: any) {
      console.error('Export error:', error);
      showAlert(error?.message || `Failed to export ${category} report`, 'error', 'Export Failed');
    }
  };

  // Role-based utilities
  const isSuperAdmin = () => user?.role === 'super-admin';
  const canManageVeg = () => user?.role === 'veg-admin' || isSuperAdmin();
  const canManageNonVeg = () => user?.role === 'non-veg-admin' || isSuperAdmin();

  const getRolePermissions = () => {
    switch (user?.role) {
      case 'super-admin':
        return 'Full access to all analytics, reports, and management features';
      case 'veg-admin':
        return 'Manage vegetarian menu items, categories, and view related analytics';
      case 'non-veg-admin':
        return 'Manage non-vegetarian menu items, categories, and view related analytics';
      default:
        return 'Limited access';
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'super-admin':
        return 'text-purple-600';
      case 'veg-admin':
        return 'text-green-600';
      case 'non-veg-admin':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getGrowthIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const getGrowthColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatsCards = () => {
    if (!stats?.overview) return [];

    const overview = stats.overview;

    const baseStats = [
      {
        title: 'Total Orders',
        value: formatNumber(overview.totalOrders),
        change: overview.totalOrders > 0 ? '+12.5%' : '0%',
        changeValue: overview.totalOrders > 0 ? 12.5 : 0,
        icon: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: 'Orders this period'
      },
      {
        title: 'Total Revenue',
        value: formatCurrency(overview.totalRevenue),
        change: overview.totalRevenue > 0 ? '+8.2%' : '0%',
        changeValue: overview.totalRevenue > 0 ? 8.2 : 0,
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Revenue generated'
      },
      {
        title: 'Active Users',
        value: formatNumber(overview.activeUsers),
        change: overview.activeUsers > 0 ? '+3.1%' : '0%',
        changeValue: overview.activeUsers > 0 ? 3.1 : 0,
        icon: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        description: 'Registered users'
      },
      {
        title: 'Avg. Order Value',
        value: formatCurrency(overview.averageOrderValue),
        change: overview.averageOrderValue > 0 ? '+5.4%' : '0%',
        changeValue: overview.averageOrderValue > 0 ? 5.4 : 0,
        icon: Target,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        description: 'Per order average'
      }
    ];

    // Role-specific stats
    if (isSuperAdmin()) {
      baseStats.push(
        {
          title: 'Total Menu Items',
          value: formatNumber(overview.totalMenuItems),
          change: '+2.1%',
          changeValue: 2.1,
          icon: Package,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          description: 'All menu items'
        },
        {
          title: 'Pending Orders',
          value: formatNumber(overview.pendingOrders),
          change: overview.pendingOrders > 0 ? '-5.2%' : '0%',
          changeValue: overview.pendingOrders > 0 ? -5.2 : 0,
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          description: 'Awaiting processing'
        }
      );
    } else {
      // Role-specific menu items
      const menuType = user?.role === 'veg-admin' ? 'Veg Menu Items' : 'Non-Veg Menu Items';
      const menuIcon = user?.role === 'veg-admin' ? Leaf : Utensils;
      const menuColor = user?.role === 'veg-admin' ? 'text-green-600' : 'text-red-600';
      const menuBg = user?.role === 'veg-admin' ? 'bg-green-50' : 'bg-red-50';

      baseStats.unshift({
        title: menuType,
        value: formatNumber(Math.floor(overview.totalMenuItems * (user?.role === 'veg-admin' ? 0.6 : 0.4))),
        change: '+3.2%',
        changeValue: 3.2,
        icon: menuIcon,
        color: menuColor,
        bgColor: menuBg,
        description: `${user?.role === 'veg-admin' ? 'Vegetarian' : 'Non-vegetarian'} items`
      });
    }

    return baseStats;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Dashboard</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}! Here's what's happening with your business.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter - Super Admin Only */}
          {isSuperAdmin() && (
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="veg">Vegetarian</SelectItem>
                <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Period Selector */}
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Picker */}
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            className="w-[280px]"
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || refreshing) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export Buttons - Super Admin Only */}
          {isSuperAdmin() && (
            <div className="flex gap-1">
              {/* Veg Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="bg-green-50/50 hover:bg-green-100/50 text-green-700 border-green-200/50 px-3"
                  >
                    <Leaf className="h-4 w-4 mr-1" />
                    Veg
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportVegNonVeg('veg', 'pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportVegNonVeg('veg', 'excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportVegNonVeg('veg', 'csv')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Non-Veg Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="bg-red-50/50 hover:bg-red-100/50 text-red-700 border-red-200/50 px-3"
                  >
                    <Utensils className="h-4 w-4 mr-1" />
                    Non-Veg
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportVegNonVeg('non-veg', 'pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportVegNonVeg('non-veg', 'excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportVegNonVeg('non-veg', 'csv')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Role Information */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${getRoleColor()}`} />
            Your Role & Permissions
            <Badge variant="secondary" className={getRoleColor()}>
              {user?.role?.replace('-', ' ').toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>{getRolePermissions()}</CardDescription>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {isLoading && !stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStatsCards().map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs">
                  {getGrowthIcon(stat.changeValue)}
                  <span className={getGrowthColor(stat.changeValue)}>
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground">from last period</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          {isSuperAdmin() && <TabsTrigger value="insights">Insights</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Revenue
                </CardTitle>
                <CardDescription>Revenue performance over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.charts?.dailyRevenue ? (
                  <>
                    <div className="flex gap-1 flex-wrap items-center mb-2">
                      {isSuperAdmin() && (
                        <>
                          {/* Veg Export Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isLoading}
                                className="text-green-600 hover:bg-green-100/20 dark:hover:bg-green-900/20"
                                title="Export Veg"
                              >
                                <Leaf className="h-5 w-5" />
                                <ChevronDown className="h-3 w-3 ml-0.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExportVegNonVeg('veg', 'pdf')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Export as PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportVegNonVeg('veg', 'excel')}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export as Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportVegNonVeg('veg', 'csv')}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export as CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Non-Veg Export Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isLoading}
                                className="text-red-600 hover:bg-red-100/20 dark:hover:bg-red-900/20"
                                title="Export Non-Veg"
                              >
                                <Utensils className="h-5 w-5" />
                                <ChevronDown className="h-3 w-3 ml-0.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExportVegNonVeg('non-veg', 'pdf')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Export as PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportVegNonVeg('non-veg', 'excel')}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export as Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportVegNonVeg('non-veg', 'csv')}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export as CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.charts.dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value, name) => [formatCurrency(value as number), 'Revenue']} labelFormatter={(label) => `Date: ${label}`} />
                        <Legend />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No order data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Monthly Revenue Trend
              </CardTitle>
              <CardDescription>
                Revenue performance over the selected period
                {categoryFilter !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {categoryFilter === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'} Only
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.charts?.dailyRevenue ? (
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsLineChart data={stats.charts.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="_id"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(value as number),
                        'Revenue'
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px]">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No monthly revenue data available</p>
                    {categoryFilter !== 'all' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Try switching to "All Categories" or select a different date range
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Menu Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Top Performing Menu Items
                </CardTitle>
                <CardDescription>Best selling items this period</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topMenuItems && stats.topMenuItems.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topMenuItems.slice(0, 5).map((item, index) => (
                      <div key={item._id} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                        <div className="flex-shrink-0">
                          <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {index + 1}
                          </Badge>
                        </div>
                        <div className="flex-shrink-0 w-12 h-12 bg-muted/50 rounded-lg overflow-hidden">
                          {item.menuItemImage ? (
                            <img
                              src={item.menuItemImage}
                              alt={item.menuItemName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.menuItemName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(item.totalQuantity)} sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.totalRevenue)}</p>
                          <p className="text-sm text-muted-foreground">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No menu performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Category Performance
                </CardTitle>
                <CardDescription>Revenue by menu categories</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.charts?.categoryPerformance ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.charts.categoryPerformance} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="categoryName" type="category" width={80} />
                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                      <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No category data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Registration Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  User Registration Trend
                </CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.charts?.userRegistrationTrend ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.charts.userRegistrationTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No user registration data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart Analytics
                </CardTitle>
                <CardDescription>Shopping cart performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {cartAnalytics?.overview ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatNumber(cartAnalytics.overview.totalCarts)}
                        </div>
                        <div className="text-sm text-blue-600">Total Carts</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPercentage(cartAnalytics.overview.conversionRate, 100)}
                        </div>
                        <div className="text-sm text-green-600">Conversion Rate</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatNumber(cartAnalytics.overview.abandonedCarts)}
                        </div>
                        <div className="text-sm text-orange-600">Abandoned</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(cartAnalytics.overview.averageCartValue)}
                        </div>
                        <div className="text-sm text-purple-600">Avg. Cart Value</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No cart analytics available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab - Super Admin Only */}
        {isSuperAdmin() && (
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Most Added Cart Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Most Added to Cart Items
                  </CardTitle>
                  <CardDescription>Items frequently added to cart but not always purchased</CardDescription>
                </CardHeader>
                <CardContent>
                  {cartAnalytics?.mostAddedMenuItems && cartAnalytics.mostAddedMenuItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cartAnalytics.mostAddedMenuItems.slice(0, 6).map((item, index) => (
                        <div key={item._id} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                          <div className="flex-shrink-0 w-12 h-12 bg-muted/50 rounded-lg overflow-hidden">
                            {item.menuItemImage ? (
                              <img
                                src={item.menuItemImage}
                                alt={item.menuItemName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.menuItemName}</p>
                            <p className="text-sm text-muted-foreground">
                              Added {formatNumber(item.addedCount)} times
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No cart insights available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Quick Actions */}
      {!isSuperAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={() => navigate('/menu')}
              >
                <Package className="h-6 w-6" />
                <span>Manage Menu Items</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={() => navigate('/reports')}
              >
                <TrendingUp className="h-6 w-6" />
                <span>View Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={() => navigate('/orders')}
              >
                <Clock className="h-6 w-6" />
                <span>Manage Orders</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};