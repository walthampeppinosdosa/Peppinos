import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchDashboardStats } from '@/store/slices/dashboardSlice';
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
  Activity
} from 'lucide-react';

export const Reports: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  const { stats, isLoading, error } = useAppSelector((state) => state.dashboard);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');

  useEffect(() => {
    dispatch(fetchDashboardStats(selectedPeriod));
  }, [dispatch, selectedPeriod]);

  const reportCards = [
    {
      title: 'Sales Report',
      description: 'Revenue and sales analytics',
      icon: DollarSign,
      value: stats?.totalRevenue ? `$${stats.totalRevenue.toLocaleString()}` : '$0',
      change: '+12.5%',
      trend: 'up',
      color: 'text-green-600'
    },
    {
      title: 'Orders Report',
      description: 'Order volume and trends',
      icon: ShoppingCart,
      value: stats?.totalOrders?.toString() || '0',
      change: '+8.2%',
      trend: 'up',
      color: 'text-blue-600'
    },
    {
      title: 'Customer Report',
      description: 'Customer acquisition and retention',
      icon: Users,
      value: stats?.totalCustomers?.toString() || '0',
      change: '+15.3%',
      trend: 'up',
      color: 'text-purple-600'
    },
    {
      title: 'Product Report',
      description: 'Product performance analytics',
      icon: Package,
      value: stats?.totalProducts?.toString() || '0',
      change: '+5.1%',
      trend: 'up',
      color: 'text-orange-600'
    }
  ];

  const detailedReports = [
    {
      title: 'Revenue Analytics',
      description: 'Detailed revenue breakdown by time period',
      icon: BarChart3,
      type: 'revenue',
      lastGenerated: '2 hours ago'
    },
    {
      title: 'Order Analytics',
      description: 'Order patterns and customer behavior',
      icon: LineChart,
      type: 'orders',
      lastGenerated: '1 hour ago'
    },
    {
      title: 'Product Performance',
      description: 'Best and worst performing menu items',
      icon: PieChart,
      type: 'products',
      lastGenerated: '30 minutes ago'
    },
    {
      title: 'Customer Insights',
      description: 'Customer demographics and preferences',
      icon: Activity,
      type: 'customers',
      lastGenerated: '45 minutes ago'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading reports</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business insights and analytics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Custom Range
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Detailed Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Reports</CardTitle>
          <CardDescription>Generate and download comprehensive business reports</CardDescription>
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last generated:</span>
                    <Badge variant="outline">{report.lastGenerated}</Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Report Activity</CardTitle>
          <CardDescription>Latest generated reports and downloads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Monthly Sales Report', type: 'PDF', size: '2.4 MB', time: '2 hours ago', user: 'Admin' },
              { name: 'Customer Analytics', type: 'Excel', size: '1.8 MB', time: '4 hours ago', user: 'Manager' },
              { name: 'Product Performance', type: 'PDF', size: '3.1 MB', time: '1 day ago', user: 'Admin' },
              { name: 'Order Trends Report', type: 'CSV', size: '856 KB', time: '2 days ago', user: 'Analyst' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{activity.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.type} • {activity.size} • Generated by {activity.user}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
