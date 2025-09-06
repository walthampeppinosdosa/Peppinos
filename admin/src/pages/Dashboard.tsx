import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  DollarSign,
  Clock,
  Star,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const salesData = [
  { name: 'Mon', sales: 2400 },
  { name: 'Tue', sales: 1398 },
  { name: 'Wed', sales: 9800 },
  { name: 'Thu', sales: 3908 },
  { name: 'Fri', sales: 4800 },
  { name: 'Sat', sales: 3800 },
  { name: 'Sun', sales: 4300 },
];

const categoryData = [
  { name: 'Veg', value: 60, color: 'hsl(var(--success))' },
  { name: 'Non-Veg', value: 40, color: 'hsl(var(--destructive))' },
];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const getRolePermissions = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'View all data (read-only access)';
      case 'veg_admin':
        return 'Manage vegetarian products and categories';
      case 'nonveg_admin':
        return 'Manage non-vegetarian products and categories';
      default:
        return 'Limited access';
    }
  };

  const getStatsCards = () => {
    const baseStats = [
      {
        title: 'Total Orders',
        value: '1,234',
        change: '+12.5%',
        icon: ShoppingCart,
        color: 'text-primary',
      },
      {
        title: 'Total Revenue',
        value: '$24,567',
        change: '+8.2%',
        icon: DollarSign,
        color: 'text-success',
      },
      {
        title: 'Active Users',
        value: '892',
        change: '+3.1%',
        icon: Users,
        color: 'text-blue-600',
      },
      {
        title: 'Avg. Rating',
        value: '4.8',
        change: '+0.2',
        icon: Star,
        color: 'text-warning',
      },
    ];

    if (user?.role !== 'super_admin') {
      const productType = user?.role === 'veg_admin' ? 'Veg Products' : 'Non-Veg Products';
      baseStats.unshift({
        title: productType,
        value: user?.role === 'veg_admin' ? '156' : '89',
        change: '+5',
        icon: Package,
        color: user?.role === 'veg_admin' ? 'text-success' : 'text-destructive',
      });
    }

    return baseStats;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}!</p>
        </div>
        <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground">
          {user?.role === 'super_admin' && 'Super Admin'}
          {user?.role === 'veg_admin' && 'Veg Admin'}
          {user?.role === 'nonveg_admin' && 'Non-Veg Admin'}
        </Badge>
      </div>

      {/* Role Information */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Your Permissions
          </CardTitle>
          <CardDescription>{getRolePermissions()}</CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getStatsCards().map((stat, index) => (
          <Card key={index} className="hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-success">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Sales</CardTitle>
            <CardDescription>Sales performance over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>Distribution of veg vs non-veg orders</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {categoryData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}: {entry.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {user?.role !== 'super_admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Package className="h-6 w-6" />
                <span>Add New Product</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>View Analytics</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Clock className="h-6 w-6" />
                <span>Pending Orders</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};