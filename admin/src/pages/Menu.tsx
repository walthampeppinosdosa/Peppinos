import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchProducts } from '@/store/slices/productsSlice';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  Download,
  Clock,
  Star,
  Leaf,
  Utensils,
  DollarSign,
  Package
} from 'lucide-react';

export const Menu: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: currentUser, canManageVeg, canManageNonVeg, canManageProduct } = useAuth();
  const { products, isLoading, error } = useAppSelector((state) => state.products);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    dispatch(fetchProducts({}));
  }, [dispatch]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Role-based filtering
    let matchesRole = true;
    if (currentUser?.role === 'veg-admin') {
      matchesRole = product.isVegetarian === true;
    } else if (currentUser?.role === 'non-veg-admin') {
      matchesRole = product.isVegetarian === false;
    }
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesType = selectedType === 'all' || 
                       (selectedType === 'veg' && product.isVegetarian) ||
                       (selectedType === 'non-veg' && !product.isVegetarian);
    
    return matchesSearch && matchesRole && matchesCategory && matchesType;
  });

  const getTypeBadgeColor = (isVegetarian: boolean) => {
    return isVegetarian 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getStatusBadgeColor = (isAvailable: boolean) => {
    return isAvailable 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getSpicyBadgeColor = (spiceLevel: string) => {
    switch (spiceLevel) {
      case 'mild':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'hot':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const canAddMenuItem = () => {
    return canManageVeg() || canManageNonVeg();
  };

  const getDefaultCategory = () => {
    if (currentUser?.role === 'veg-admin') return 'vegetarian';
    if (currentUser?.role === 'non-veg-admin') return 'non-vegetarian';
    return null;
  };

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
          <p className="text-destructive mb-2">Error loading menu items</p>
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
          <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant menu items
            {currentUser?.role === 'veg-admin' && ' (Vegetarian items only)'}
            {currentUser?.role === 'non-veg-admin' && ' (Non-vegetarian items only)'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Menu
          </Button>
          {canAddMenuItem() && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          )}
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
                  placeholder="Search menu items by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {currentUser?.role === 'super-admin' && (
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                </select>
              )}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="appetizers">Appetizers</option>
                <option value="mains">Main Course</option>
                <option value="desserts">Desserts</option>
                <option value="beverages">Beverages</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {product.isVegetarian ? (
                      <Leaf className="h-4 w-4 text-green-600" />
                    ) : (
                      <Utensils className="h-4 w-4 text-red-600" />
                    )}
                    {product.name}
                    {product.rating && product.rating > 4 && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">{product.category}</CardDescription>
                </div>
                <Badge className={getTypeBadgeColor(product.isVegetarian)}>
                  {product.isVegetarian ? 'Veg' : 'Non-Veg'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">${product.price}</span>
                </div>
                <Badge className={getStatusBadgeColor(product.isAvailable)}>
                  {product.isAvailable ? 'Available' : 'Out of Stock'}
                </Badge>
              </div>
              
              {product.spiceLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Spice Level</span>
                  <Badge className={getSpicyBadgeColor(product.spiceLevel)}>
                    {product.spiceLevel}
                  </Badge>
                </div>
              )}
              
              {product.preparationTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {product.preparationTime} mins
                </div>
              )}
              
              {product.rating && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span>{product.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({product.reviewCount || 0} reviews)</span>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Added: {new Date(product.createdAt).toLocaleDateString()}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {canManageProduct(product.isVegetarian) && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No menu items found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No menu items have been added yet.'}
            </p>
            {canAddMenuItem() && (
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Menu Item
                {getDefaultCategory() && ` (${getDefaultCategory()})`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
