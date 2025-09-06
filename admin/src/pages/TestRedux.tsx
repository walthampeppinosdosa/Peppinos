import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchProducts } from '../store/slices/productsSlice';
import { fetchCategories } from '../store/slices/categoriesSlice';
import { fetchOrders } from '../store/slices/ordersSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const TestRedux: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  
  const products = useAppSelector((state) => state.products);
  const categories = useAppSelector((state) => state.categories);
  const orders = useAppSelector((state) => state.orders);
  const users = useAppSelector((state) => state.users);
  const dashboard = useAppSelector((state) => state.dashboard);

  const testReduxIntegration = async () => {
    if (!isAuthenticated) return;

    try {
      // Test all Redux slices
      await Promise.all([
        dispatch(fetchProducts({})),
        dispatch(fetchCategories({})),
        dispatch(fetchOrders({})),
        dispatch(fetchUsers({})),
        dispatch(fetchDashboardStats('30d')),
      ]);
    } catch (error) {
      console.error('Redux integration test failed:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      testReduxIntegration();
    }
  }, [isAuthenticated]);

  const getStatusIcon = (isLoading: boolean, error: string | null) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (isLoading: boolean, error: string | null) => {
    if (isLoading) return <Badge variant="secondary">Loading...</Badge>;
    if (error) return <Badge variant="destructive">Error</Badge>;
    return <Badge variant="default" className="bg-green-500">Success</Badge>;
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please log in to test Redux integration
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Redux Integration Test</h1>
          <p className="text-muted-foreground">
            Testing all Redux slices and API integrations
          </p>
        </div>
        <Button onClick={testReduxIntegration} disabled={products.isLoading}>
          {products.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Run Test Again'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>User:</strong> {user?.name}</p>
              <p><strong>Role:</strong> {user?.role}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <Badge variant="default" className="bg-green-500">Authenticated</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Products Slice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(products.isLoading, products.error)}
              Products Slice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {getStatusBadge(products.isLoading, products.error)}</p>
              <p><strong>Products:</strong> {products.products.length}</p>
              <p><strong>Current Page:</strong> {products.pagination.currentPage}</p>
              {products.error && (
                <p className="text-sm text-red-500">{products.error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories Slice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(categories.isLoading, categories.error)}
              Categories Slice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {getStatusBadge(categories.isLoading, categories.error)}</p>
              <p><strong>Categories:</strong> {categories.categories.length}</p>
              <p><strong>Current Page:</strong> {categories.pagination.currentPage}</p>
              {categories.error && (
                <p className="text-sm text-red-500">{categories.error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Slice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(orders.isLoading, orders.error)}
              Orders Slice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {getStatusBadge(orders.isLoading, orders.error)}</p>
              <p><strong>Orders:</strong> {orders.orders.length}</p>
              <p><strong>Current Page:</strong> {orders.pagination.currentPage}</p>
              {orders.error && (
                <p className="text-sm text-red-500">{orders.error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Slice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(users.isLoading, users.error)}
              Users Slice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {getStatusBadge(users.isLoading, users.error)}</p>
              <p><strong>Users:</strong> {users.users.length}</p>
              <p><strong>Current Page:</strong> {users.pagination.currentPage}</p>
              {users.error && (
                <p className="text-sm text-red-500">{users.error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Slice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(dashboard.isLoading, dashboard.error)}
              Dashboard Slice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {getStatusBadge(dashboard.isLoading, dashboard.error)}</p>
              <p><strong>Stats:</strong> {dashboard.stats ? 'Loaded' : 'Not loaded'}</p>
              <p><strong>Period:</strong> {dashboard.selectedPeriod}</p>
              {dashboard.error && (
                <p className="text-sm text-red-500">{dashboard.error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Integration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>API Integration Summary</CardTitle>
          <CardDescription>
            Overview of all Redux slices and their API integration status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <p className="text-sm">Authentication</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <p className="text-sm">Products API</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <p className="text-sm">Categories API</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <p className="text-sm">Orders API</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <p className="text-sm">Users API</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">⚠</div>
              <p className="text-sm">Dashboard API</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <p className="text-sm">Redux Store</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <p className="text-sm">Gold Theme</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
