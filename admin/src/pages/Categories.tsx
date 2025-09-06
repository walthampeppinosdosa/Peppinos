import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchCategories } from '@/store/slices/categoriesSlice';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Filter,
  Download,
  FolderOpen,
  Leaf,
  Utensils,
  Image
} from 'lucide-react';

export const Categories: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: currentUser, canManageVeg, canManageNonVeg } = useAuth();
  const { categories, isLoading, error } = useAppSelector((state) => state.categories);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    dispatch(fetchCategories({}));
  }, [dispatch]);

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Role-based filtering
    let matchesRole = true;
    if (currentUser?.role === 'veg-admin') {
      matchesRole = category.isVegetarian === true;
    } else if (currentUser?.role === 'non-veg-admin') {
      matchesRole = category.isVegetarian === false;
    }
    
    const matchesType = selectedType === 'all' || 
                       (selectedType === 'veg' && category.isVegetarian) ||
                       (selectedType === 'non-veg' && !category.isVegetarian);
    
    return matchesSearch && matchesRole && matchesType;
  });

  const getTypeBadgeColor = (isVegetarian: boolean) => {
    return isVegetarian 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const canManageCategory = (category: any) => {
    if (currentUser?.role === 'super-admin') return true;
    if (currentUser?.role === 'veg-admin') return category.isVegetarian;
    if (currentUser?.role === 'non-veg-admin') return !category.isVegetarian;
    return false;
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
          <p className="text-destructive mb-2">Error loading categories</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {(canManageVeg() || canManageNonVeg()) && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
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
                  placeholder="Search categories by name or description..."
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
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <Card key={category._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    {category.image ? (
                      <Image className="h-5 w-5 text-primary" />
                    ) : category.isVegetarian ? (
                      <Leaf className="h-5 w-5 text-green-600" />
                    ) : (
                      <Utensils className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription className="text-sm">{category.slug}</CardDescription>
                  </div>
                </div>
                <Badge className={getTypeBadgeColor(category.isVegetarian)}>
                  {category.isVegetarian ? (
                    <>
                      <Leaf className="h-3 w-3 mr-1" />
                      Veg
                    </>
                  ) : (
                    <>
                      <Utensils className="h-3 w-3 mr-1" />
                      Non-Veg
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {category.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={getStatusBadgeColor(category.isActive)}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Menu Items</span>
                <span className="text-sm font-medium">{category.menuItemCount || 0}</span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Created: {new Date(category.createdAt).toLocaleDateString()}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {canManageCategory(category) && (
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

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedType !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No categories have been created yet.'}
            </p>
            {(canManageVeg() || canManageNonVeg()) && (
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
