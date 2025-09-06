import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  MapPin,
  Clock,
  DollarSign,
  User
} from 'lucide-react';
import { Order } from '@/types';

// Mock data
const mockOrders: Order[] = [
  {
    id: 'ORD001',
    userId: 'user1',
    items: [],
    status: 'delivered',
    totalAmount: 450,
    deliveryAddress: {
      id: '1',
      userId: 'user1',
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
      isDefault: true
    },
    orderDate: '2024-12-06T10:30:00Z',
    deliveryDate: '2024-12-06T11:15:00Z',
    paymentMethod: 'Card',
    paymentStatus: 'paid'
  },
  {
    id: 'ORD002',
    userId: 'user2',
    items: [],
    status: 'preparing',
    totalAmount: 280,
    deliveryAddress: {
      id: '2',
      userId: 'user2',
      street: '456 Park Ave',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India',
      isDefault: true
    },
    orderDate: '2024-12-06T12:00:00Z',
    paymentMethod: 'Cash',
    paymentStatus: 'pending'
  },
  {
    id: 'ORD003',
    userId: 'user3',
    items: [],
    status: 'pending',
    totalAmount: 680,
    deliveryAddress: {
      id: '3',
      userId: 'user3',
      street: '789 Oak Street',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India',
      isDefault: true
    },
    orderDate: '2024-12-06T14:20:00Z',
    paymentMethod: 'UPI',
    paymentStatus: 'paid'
  }
];

export const Orders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = mockOrders.filter(order => {
    const searchMatch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       order.deliveryAddress.city.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'preparing':
        return 'bg-blue-500 text-white';
      case 'delivered':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Monitor and manage all orders</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              <span className="text-sm font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {mockOrders.filter(o => o.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium">Preparing</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {mockOrders.filter(o => o.status === 'preparing').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-sm font-medium">Delivered</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {mockOrders.filter(o => o.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              ₹{mockOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{order.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Ordered on {formatDate(order.orderDate)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</div>
                  <Badge className={getPaymentStatusColor(order.paymentStatus)} variant="outline">
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Delivery Address</p>
                    <p className="text-sm text-muted-foreground">
                      {order.deliveryAddress.city}, {order.deliveryAddress.state}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Payment Method</p>
                    <p className="text-sm text-muted-foreground">{order.paymentMethod}</p>
                  </div>
                </div>
                
                {order.deliveryDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Delivered At</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.deliveryDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-3 w-3" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">No orders found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};