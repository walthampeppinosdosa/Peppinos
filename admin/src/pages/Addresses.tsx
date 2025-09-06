import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  Download,
  MapPin,
  Home,
  Building,
  Star
} from 'lucide-react';

// Mock data for addresses - in real app this would come from Redux store
const mockAddresses = [
  {
    _id: '1',
    userId: 'user1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    street: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    isDefault: true,
    type: 'home',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    _id: '2',
    userId: 'user2',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    street: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210',
    country: 'USA',
    isDefault: false,
    type: 'work',
    createdAt: '2024-01-16T14:20:00Z',
    updatedAt: '2024-01-16T14:20:00Z'
  },
  {
    _id: '3',
    userId: 'user1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    street: '789 Business Blvd',
    city: 'New York',
    state: 'NY',
    zipCode: '10002',
    country: 'USA',
    isDefault: false,
    type: 'work',
    createdAt: '2024-01-17T09:15:00Z',
    updatedAt: '2024-01-17T09:15:00Z'
  }
];

export const Addresses: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [addresses] = useState(mockAddresses);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading] = useState(false);

  const filteredAddresses = addresses.filter(address => {
    const matchesSearch = address.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         address.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         address.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         address.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || address.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'home':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'work':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'other':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home className="h-4 w-4" />;
      case 'work':
        return <Building className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Address Management</h1>
          <p className="text-muted-foreground">Manage customer delivery addresses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search addresses by user, street, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAddresses.map((address) => (
          <Card key={address._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getTypeIcon(address.type)}
                    {address.userName}
                    {address.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">{address.userEmail}</CardDescription>
                </div>
                <Badge className={getTypeBadgeColor(address.type)}>
                  {address.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">{address.street}</div>
                    <div className="text-muted-foreground">
                      {address.city}, {address.state} {address.zipCode}
                    </div>
                    <div className="text-muted-foreground">{address.country}</div>
                  </div>
                </div>
              </div>
              
              {address.isDefault && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <Star className="h-4 w-4 fill-current" />
                  Default Address
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Added: {new Date(address.createdAt).toLocaleDateString()}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAddresses.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No addresses found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedType !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No addresses have been added yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
