import React, { useState } from 'react';
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
  Clock,
  Star
} from 'lucide-react';
import { Product } from '@/types';

// Mock data
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Paneer Butter Masala',
    description: 'Rich and creamy paneer curry with butter and tomatoes',
    quantity: 50,
    size: 'medium',
    spicyLevel: 'medium',
    preparationTime: 20,
    addOns: [
      { id: '1', name: 'Extra Paneer', price: 50 },
      { id: '2', name: 'Garlic Naan', price: 30 }
    ],
    photos: ['/placeholder-veg.jpg'],
    mrp: 280,
    discountedPrice: 250,
    category: 'Main Course',
    type: 'veg',
    isAvailable: true,
    reviews: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice with tender chicken pieces',
    quantity: 30,
    size: 'large',
    spicyLevel: 'hot',
    preparationTime: 45,
    addOns: [
      { id: '3', name: 'Extra Chicken', price: 80 },
      { id: '4', name: 'Raita', price: 40 }
    ],
    photos: ['/placeholder-nonveg.jpg'],
    mrp: 450,
    discountedPrice: 420,
    category: 'Biryani',
    type: 'nonveg',
    isAvailable: true,
    reviews: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '3',
    name: 'Dal Tadka',
    description: 'Yellow lentils tempered with cumin and garlic',
    quantity: 100,
    size: 'medium',
    spicyLevel: 'mild',
    preparationTime: 15,
    addOns: [
      { id: '5', name: 'Extra Dal', price: 30 }
    ],
    photos: ['/placeholder-veg.jpg'],
    mrp: 180,
    category: 'Dal',
    type: 'veg',
    isAvailable: true,
    reviews: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

export const Products: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'veg' | 'nonveg'>('all');

  const canEdit = user?.role !== 'super_admin';
  const userProducts = mockProducts.filter(product => {
    const typeFilter = filterType === 'all' || product.type === filterType;
    const roleFilter = user?.role === 'super_admin' || 
                      (user?.role === 'veg_admin' && product.type === 'veg') ||
                      (user?.role === 'nonveg_admin' && product.type === 'nonveg');
    const searchFilter = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return typeFilter && roleFilter && searchFilter;
  });

  const getSpicyLevelColor = (level: string) => {
    switch (level) {
      case 'mild': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'hot': return 'bg-destructive text-destructive-foreground';
      case 'extra_hot': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'veg' 
      ? 'bg-success text-success-foreground' 
      : 'bg-destructive text-destructive-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your {user?.role === 'veg_admin' ? 'vegetarian' : user?.role === 'nonveg_admin' ? 'non-vegetarian' : ''} products
          </p>
        </div>
        {canEdit && (
          <Button className="bg-gradient-primary hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
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
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                All
              </Button>
              {(user?.role === 'super_admin' || user?.role === 'veg_admin') && (
                <Button
                  variant={filterType === 'veg' ? 'default' : 'outline'}
                  onClick={() => setFilterType('veg')}
                  size="sm"
                  className={filterType === 'veg' ? 'bg-success hover:bg-success/90' : ''}
                >
                  Veg
                </Button>
              )}
              {(user?.role === 'super_admin' || user?.role === 'nonveg_admin') && (
                <Button
                  variant={filterType === 'nonveg' ? 'default' : 'outline'}
                  onClick={() => setFilterType('nonveg')}
                  size="sm"
                  className={filterType === 'nonveg' ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  Non-Veg
                </Button>
              )}
            </div>

            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-soft transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getTypeColor(product.type)}>
                      {product.type === 'veg' ? 'Veg' : 'Non-Veg'}
                    </Badge>
                    <Badge className={getSpicyLevelColor(product.spicyLevel)}>
                      {product.spicyLevel}
                    </Badge>
                  </div>
                </div>
                <Badge variant={product.isAvailable ? 'default' : 'secondary'}>
                  {product.isAvailable ? 'Available' : 'Out of Stock'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <CardDescription className="mb-4">
                {product.description}
              </CardDescription>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <div className="flex items-center gap-2">
                    {product.discountedPrice && (
                      <span className="line-through text-muted-foreground text-sm">
                        ₹{product.mrp}
                      </span>
                    )}
                    <span className="font-semibold">
                      ₹{product.discountedPrice || product.mrp}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preparation Time</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm">{product.preparationTime} mins</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="text-sm">{product.quantity} items</span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="mr-2 h-3 w-3" />
                  View
                </Button>
                {canEdit && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {userProducts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No products found matching your criteria.</p>
            </div>
            {canEdit && (
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Product
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};