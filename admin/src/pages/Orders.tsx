import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { useAlert } from '@/hooks/useAlert';
import { useAuth } from '@/hooks/useAuth';
import { formatters } from '@/utils/exportUtils';
import { socket, connectSocket, disconnectSocket, joinAdminRoom } from '@/socket';
import {
  Search,
  Filter,
  Eye,
  MapPin,
  Clock,
  DollarSign,
  User,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Grid3X3,
  Grid2X2,
  LayoutGrid,
  Calendar,
  X,
  Leaf,
  Utensils,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchOrders,
  fetchOrderStats,
  updateOrderStatus,
  exportOrders,
  updateFilters,
  resetFilters,
  clearError,
  type Order
} from '@/store/slices/ordersSlice';


export const Orders: React.FC = () => {
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const { user: currentUser, isSuperAdmin, canManageVeg, canManageNonVeg } = useAuth();

  const {
    orders,
    stats,
    isLoading,
    error,
    pagination,
    filters
  } = useAppSelector((state) => state.orders);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'2' | '3' | '4'>('2');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Date validation functions
  const handleStartDateChange = (newStartDate: string) => {
    setDateRange(prev => {
      const updatedRange = { ...prev, startDate: newStartDate };

      // If end date exists and is before the new start date, clear it
      if (prev.endDate && newStartDate && new Date(newStartDate) > new Date(prev.endDate)) {
        updatedRange.endDate = '';
      }

      return updatedRange;
    });
  };

  const handleEndDateChange = (newEndDate: string) => {
    setDateRange(prev => {
      // Only update if the new end date is after or equal to start date
      if (!prev.startDate || !newEndDate || new Date(newEndDate) >= new Date(prev.startDate)) {
        return { ...prev, endDate: newEndDate };
      }

      // If end date is before start date, show error and don't update
      showAlert('End date cannot be before start date', 'error', 'Invalid Date Range');
      return prev;
    });
  };

  // Get minimum date for end date picker (start date + 1 day or start date itself)
  const getMinEndDate = () => {
    return dateRange.startDate || undefined;
  };

  // Get maximum date for start date picker (end date or today)
  const getMaxStartDate = () => {
    return dateRange.endDate || new Date().toISOString().split('T')[0];
  };

  // Load data on component mount
  useEffect(() => {
    dispatch(fetchOrders(filters));
    dispatch(fetchOrderStats({}));
  }, [dispatch]);

  // Reload data when filters change
  useEffect(() => {
    dispatch(fetchOrders(filters));
  }, [dispatch, filters]);

  // Handle error display
  useEffect(() => {
    if (error) {
      showAlert(error, 'error', 'Error');
      dispatch(clearError());
    }
  }, [error, showAlert, dispatch]);



  // Memoized event handlers to prevent recreation on every render
  const onOrderCreated = useCallback((order: any) => {
    setLastUpdateTime(new Date());
    showAlert(`New order received: ${order.orderNumber}`, 'success', 'New Order');
    // Refresh with current filters and pagination
    const currentFilters = {
      ...filters,
      page: pagination.currentPage,
      limit: pagination.itemsPerPage
    };
    dispatch(fetchOrders(currentFilters));
    dispatch(fetchOrderStats({}));
  }, [filters, pagination, dispatch, showAlert]);

  const onOrderUpdated = useCallback((order: any) => {
    setLastUpdateTime(new Date());
    // Refresh with current filters and pagination
    const currentFilters = {
      ...filters,
      page: pagination.currentPage,
      limit: pagination.itemsPerPage
    };
    dispatch(fetchOrders(currentFilters));
    dispatch(fetchOrderStats({}));
  }, [filters, pagination, dispatch]);

  const onOrderStatusChanged = useCallback((data: any) => {
    setLastUpdateTime(new Date());
    showAlert(`Order ${data.orderNumber} status updated`, 'info', 'Status Update');
    // Refresh with current filters and pagination
    const currentFilters = {
      ...filters,
      page: pagination.currentPage,
      limit: pagination.itemsPerPage
    };
    dispatch(fetchOrders(currentFilters));
    dispatch(fetchOrderStats({}));
  }, [filters, pagination, dispatch, showAlert]);

  // Socket.IO integration for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      return;
    }

    // Named event handler functions (required for proper cleanup)
    function onConnect() {
      setSocketConnected(true);
      setLastUpdateTime(new Date());
      joinAdminRoom();
    }

    function onDisconnect(reason: string) {
      setSocketConnected(false);
    }

    function onConnectError(error: Error) {
      setSocketConnected(false);
    }

    function onAdminRoomJoined(data: any) {
      // Admin room joined successfully
    }

    // Register event listeners with named functions
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('orderCreated', onOrderCreated);
    socket.on('orderUpdated', onOrderUpdated);
    socket.on('orderStatusChanged', onOrderStatusChanged);
    socket.on('adminRoomJoined', onAdminRoomJoined);

    // Set initial connection state
    setSocketConnected(socket.connected);

    // Connect to Socket.IO server with authentication
    connectSocket();

    // Cleanup function - remove only the specific named listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('orderCreated', onOrderCreated);
      socket.off('orderUpdated', onOrderUpdated);
      socket.off('orderStatusChanged', onOrderStatusChanged);
      socket.off('adminRoomJoined', onAdminRoomJoined);
    };
  }, [onOrderCreated, onOrderUpdated, onOrderStatusChanged]); // Only depend on memoized handlers

  // Separate effect for component unmount cleanup (following React Socket.IO guide)
  useEffect(() => {
    return () => {
      // Disconnect socket when component unmounts
      disconnectSocket();
    };
  }, []);

  // Manual refresh functionality
  const refreshData = useCallback(() => {
    dispatch(fetchOrders(filters));
    dispatch(fetchOrderStats({}));
    setLastUpdateTime(new Date());
  }, [dispatch, filters]);

  const handleFilterChange = (key: string, value: string) => {
    dispatch(updateFilters({ [key]: value, page: 1 }));
  };

  const handleSearch = (value: string) => {
    dispatch(updateFilters({ search: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    dispatch(updateFilters({ page }));
  };

  const handleStatusUpdate = async (orderId: string, deliveryStatus?: string, paymentStatus?: string) => {
    try {
      await dispatch(updateOrderStatus({
        orderId,
        deliveryStatus,
        paymentStatus
      })).unwrap();

      showAlert('Order status updated successfully', 'success', 'Success');
    } catch (error) {
      showAlert('Failed to update order status', 'error', 'Error');
    }
  };

  // Helper function to determine if an order contains veg/non-veg items
  const getOrderCategory = (order: Order) => {
    if (!order.items || order.items.length === 0) return 'unknown';

    // Check if we have menu data populated (this might not always be available)
    const itemsWithMenuData = order.items.filter(item => item.menu);
    if (itemsWithMenuData.length === 0) {
      // Fallback: try to determine from menuName patterns or return unknown
      return 'unknown';
    }

    // For now, we'll use a simple approach based on menu names or return mixed
    // This is a temporary solution until we can get proper category data
    const vegKeywords = ['veg', 'vegetarian', 'paneer', 'dal', 'sabzi', 'aloo'];
    const nonVegKeywords = ['chicken', 'mutton', 'fish', 'egg', 'meat', 'prawn', 'lamb'];

    let hasVeg = false;
    let hasNonVeg = false;

    order.items.forEach(item => {
      const menuName = (item.menuName || '').toLowerCase();
      if (vegKeywords.some(keyword => menuName.includes(keyword))) {
        hasVeg = true;
      }
      if (nonVegKeywords.some(keyword => menuName.includes(keyword))) {
        hasNonVeg = true;
      }
    });

    if (hasVeg && hasNonVeg) return 'mixed';
    if (hasVeg) return 'veg';
    if (hasNonVeg) return 'non-veg';
    return 'mixed'; // Default to mixed if we can't determine
  };

  // Filter orders based on category selection
  const filteredOrdersByCategory = orders.filter(order => {
    if (selectedCategory === 'all') return true;
    return getOrderCategory(order) === selectedCategory;
  });

  // Export configuration
  const exportColumns = [
    { key: 'orderNumber', label: 'Order Number', width: 20 },
    { key: 'user.name', label: 'Customer Name', width: 25, formatter: (value: any, row: any) => row.user?.name || 'N/A' },
    { key: 'user.email', label: 'Customer Email', width: 30, formatter: (value: any, row: any) => row.user?.email || 'N/A' },
    { key: 'totalPrice', label: 'Total Amount', width: 15, formatter: formatters.currency },
    { key: 'deliveryStatus', label: 'Delivery Status', width: 20, formatter: (value: string) => value.replace('_', ' ').toUpperCase() },
    { key: 'paymentStatus', label: 'Payment Status', width: 20, formatter: (value: string) => value.toUpperCase() },
    { key: 'createdAt', label: 'Order Date', width: 25, formatter: formatters.date },
    { key: 'deliveryAddress.city', label: 'City', width: 20, formatter: (value: any, row: any) => row.deliveryAddress?.city || 'N/A' },
    { key: 'items.length', label: 'Items Count', width: 15, formatter: (value: any, row: any) => row.items?.length || 0 },
    { key: 'isGuestOrder', label: 'Customer Type', width: 20, formatter: (value: boolean) => value ? 'Guest' : 'Registered' }
  ];

  const exportData = filteredOrdersByCategory.map(order => ({
    orderNumber: order.orderNumber,
    'user.name': order.user?.name || 'N/A',
    'user.email': order.user?.email || 'N/A',
    totalPrice: order.totalPrice,
    deliveryStatus: order.deliveryStatus,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    'deliveryAddress.city': order.deliveryAddress?.city || 'N/A',
    'items.length': order.items?.length || 0,
    isGuestOrder: order.isGuestOrder,
    customerType: order.isGuestOrder ? 'Guest' : 'Registered'
  }));

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      preparing: { color: 'bg-orange-100 text-orange-800', icon: Package },
      ready: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      out_for_delivery: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800' },
      paid: { color: 'bg-green-100 text-green-800' },
      failed: { color: 'bg-red-100 text-red-800' },
      refunded: { color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={config.color}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGridCols = () => {
    switch (viewMode) {
      case '2': return 'grid-cols-1 md:grid-cols-2';
      case '3': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '4': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };



  // Calculate category-specific stats for super-admin
  const getCategoryStats = () => {
    const vegOrders = orders.filter(order => getOrderCategory(order) === 'veg');
    const nonVegOrders = orders.filter(order => getOrderCategory(order) === 'non-veg');
    const mixedOrders = orders.filter(order => getOrderCategory(order) === 'mixed');

    return {
      veg: {
        count: vegOrders.length,
        revenue: vegOrders.reduce((sum, order) => sum + order.totalPrice, 0),
        avgOrderValue: vegOrders.length > 0 ? vegOrders.reduce((sum, order) => sum + order.totalPrice, 0) / vegOrders.length : 0
      },
      nonVeg: {
        count: nonVegOrders.length,
        revenue: nonVegOrders.reduce((sum, order) => sum + order.totalPrice, 0),
        avgOrderValue: nonVegOrders.length > 0 ? nonVegOrders.reduce((sum, order) => sum + order.totalPrice, 0) / nonVegOrders.length : 0
      },
      mixed: {
        count: mixedOrders.length,
        revenue: mixedOrders.reduce((sum, order) => sum + order.totalPrice, 0),
        avgOrderValue: mixedOrders.length > 0 ? mixedOrders.reduce((sum, order) => sum + order.totalPrice, 0) / mixedOrders.length : 0
      }
    };
  };

  // Calculate fallback stats from orders data if API stats are not available
  const calculateFallbackStats = () => {
    const pendingOrders = orders.filter(order => order.deliveryStatus === 'pending').length;
    const preparingOrders = orders.filter(order => order.deliveryStatus === 'preparing').length;
    const deliveredOrders = orders.filter(order => order.deliveryStatus === 'delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    return {
      overview: {
        pendingOrders,
        preparingOrders,
        completedOrders: deliveredOrders,
        totalRevenue
      }
    };
  };

  // Use API stats if available, otherwise calculate from orders data
  const displayStats = stats || calculateFallbackStats();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="space-y-6 flex-1 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout Toggle */}
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as '2' | '3' | '4')}>
            <ToggleGroupItem value="2" aria-label="2 columns">
              <Grid2X2 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="3" aria-label="3 columns">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="4" aria-label="4 columns">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <ExportDropdown
            data={exportData}
            columns={exportColumns}
            filename="orders"
            title="Orders Export"
            subtitle={`Total orders: ${filteredOrdersByCategory.length}${selectedCategory !== 'all' ? ` (${selectedCategory} filtered)` : ''}`}
            disabled={isLoading || filteredOrdersByCategory.length === 0}
          />

          <Button
            variant="outline"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Connection Status */}
          <ConnectionStatus
            isConnected={socketConnected}
            lastUpdateTime={lastUpdateTime}
          />
        </div>
      </div>

      {/* Stats Cards */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium">Pending</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {displayStats.overview.pendingOrders}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium">Preparing</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {displayStats.overview.preparingOrders}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Delivered</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {displayStats.overview.completedOrders}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Total Revenue</span>
              </div>
              <div className="text-2xl font-bold mt-2">
                {formatCurrency(displayStats.overview.totalRevenue)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category-specific Stats for Admins */}
      {(isSuperAdmin() || canManageVeg() || canManageNonVeg()) && orders.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Category-wise Order Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(() => {
              const categoryStats = getCategoryStats();
              const cards = [];

              // Show vegetarian stats for super-admin and veg-admin
              if (isSuperAdmin() || canManageVeg()) {
                cards.push(
                  <Card key="veg">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Vegetarian Orders</span>
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        {categoryStats.veg.count}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Revenue: {formatCurrency(categoryStats.veg.revenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(categoryStats.veg.avgOrderValue)}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Show non-vegetarian stats for super-admin and non-veg-admin
              if (isSuperAdmin() || canManageNonVeg()) {
                cards.push(
                  <Card key="non-veg">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Non-Vegetarian Orders</span>
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        {categoryStats.nonVeg.count}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Revenue: {formatCurrency(categoryStats.nonVeg.revenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(categoryStats.nonVeg.avgOrderValue)}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Show mixed orders only for super-admin
              if (isSuperAdmin()) {
                cards.push(
                  <Card key="mixed">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Mixed Orders</span>
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        {categoryStats.mixed.count}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Revenue: {formatCurrency(categoryStats.mixed.revenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(categoryStats.mixed.avgOrderValue)}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return cards;
            })()}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Main Filters Row */}
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={filters.search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filters.deliveryStatus || "all"} onValueChange={(value) => handleFilterChange('deliveryStatus', value === "all" ? "" : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Delivery Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.paymentStatus || "all"} onValueChange={(value) => handleFilterChange('paymentStatus', value === "all" ? "" : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter for Admins */}
              {(isSuperAdmin() || canManageVeg() || canManageNonVeg()) && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Order Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {(isSuperAdmin() || canManageVeg()) && (
                      <SelectItem value="veg">Vegetarian Only</SelectItem>
                    )}
                    {(isSuperAdmin() || canManageNonVeg()) && (
                      <SelectItem value="non-veg">Non-Vegetarian Only</SelectItem>
                    )}
                    {isSuperAdmin() && (
                      <SelectItem value="mixed">Mixed Orders</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Date Range
              </Button>

              <Button
                variant="outline"
                onClick={() => dispatch(resetFilters())}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            {/* Date Range Filters */}
            {showFilters && (
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      max={getMaxStartDate()}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      placeholder="Select start date"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      min={getMinEndDate()}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      placeholder="Select end date"
                      disabled={!dateRange.startDate}
                    />
                    {!dateRange.startDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Please select a start date first
                      </p>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={() => {
                        dispatch(updateFilters({
                          startDate: dateRange.startDate,
                          endDate: dateRange.endDate
                        }));
                      }}
                      disabled={!dateRange.startDate || !dateRange.endDate}
                    >
                      Apply Date Filter
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateRange({ startDate: '', endDate: '' });
                        dispatch(updateFilters({ startDate: '', endDate: '' }));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {dateRange.startDate && dateRange.endDate && (
                    <div className="col-span-full">
                      <p className="text-xs text-muted-foreground">
                        Filtering orders from {new Date(dateRange.startDate).toLocaleDateString()} to {new Date(dateRange.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading orders...
            </div>
          </CardContent>
        </Card>
      ) : filteredOrdersByCategory.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              {selectedCategory !== 'all' ? `No ${selectedCategory} orders found` : 'No orders found'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid ${getGridCols()} gap-6`}>
          {filteredOrdersByCategory.map((order) => (
            <Card key={order._id} className="hover:shadow-md transition-shadow flex flex-col h-full">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {order.user.name} • {order.user.email}
                        </span>
                        {order.isGuestOrder && (
                          <Badge variant="outline" className="text-xs">Guest</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.deliveryStatus)}
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">{formatCurrency(order.totalPrice)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {order.deliveryAddress ?
                        `${order.deliveryAddress.city}, ${order.deliveryAddress.state}` :
                        'Pickup Order'
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.items.length} items</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select
                      value={order.deliveryStatus}
                      onValueChange={(value) => handleStatusUpdate(order._id, value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={order.paymentStatus}
                      onValueChange={(value) => handleStatusUpdate(order._id, undefined, value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Order Details - {order.orderNumber}</DialogTitle>
                        <DialogDescription>
                          Complete order information and items
                        </DialogDescription>
                      </DialogHeader>

                      {selectedOrder && (
                        <div className="space-y-6">
                          {/* Customer Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Customer Information</h4>
                              <div className="space-y-1 text-sm">
                                <p><span className="font-medium">Name:</span> {selectedOrder.user.name}</p>
                                <p><span className="font-medium">Email:</span> {selectedOrder.user.email}</p>
                                <p><span className="font-medium">Phone:</span> {selectedOrder.user.phoneNumber}</p>
                                <p><span className="font-medium">Type:</span> {selectedOrder.isGuestOrder ? 'Guest' : 'Registered'}</p>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">
                                {selectedOrder.deliveryAddress ? 'Delivery Address' : 'Order Type'}
                              </h4>
                              <div className="text-sm">
                                {selectedOrder.deliveryAddress ? (
                                  <>
                                    <p>{selectedOrder.deliveryAddress.street}</p>
                                    <p>{selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state}</p>
                                    <p>{selectedOrder.deliveryAddress.zipCode}, {selectedOrder.deliveryAddress.country}</p>
                                    <p>Phone: {selectedOrder.deliveryAddress.phoneNumber}</p>
                                  </>
                                ) : (
                                  <p>Pickup Order</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Special Instructions */}
                          {selectedOrder.specialInstructions && (
                            <div>
                              <h4 className="font-semibold mb-2">Special Instructions</h4>
                              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                                <p className="text-sm text-orange-800">{selectedOrder.specialInstructions}</p>
                              </div>
                            </div>
                          )}

                          {/* Order Items */}
                          <div>
                            <h4 className="font-semibold mb-2">Order Items</h4>
                            <div className="space-y-2">
                              {selectedOrder.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={item.menuImage}
                                      alt={item.menuName}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                    <div>
                                      <p className="font-medium">{item.menuName}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Size: {item.size} • Qty: {item.quantity}
                                      </p>
                                      {item.addons.length > 0 && (
                                        <p className="text-sm text-muted-foreground">
                                          Addons: {item.addons.map(addon => addon.name).join(', ')}
                                        </p>
                                      )}
                                      {item.specialInstructions && (
                                        <p className="text-sm text-orange-600 font-medium">
                                          Note: {item.specialInstructions}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">{formatCurrency(item.itemTotal)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Summary */}
                          <div className="border-t pt-4">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(selectedOrder.subtotal)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Delivery Fee:</span>
                                <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>{formatCurrency(selectedOrder.tax)}</span>
                              </div>
                              {selectedOrder.discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Discount:</span>
                                  <span>-{formatCurrency(selectedOrder.discount)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(selectedOrder.totalPrice)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
            {pagination.totalItems} orders
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>

            <span className="text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

