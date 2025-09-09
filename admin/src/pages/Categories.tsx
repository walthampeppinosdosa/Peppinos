import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchCategories, fetchParentCategories, deleteCategory } from '@/store/slices/categoriesSlice';
import ExportDropdown from '@/components/ui/export-dropdown';
import { useAlert } from '@/hooks/useAlert';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  FolderOpen,
  Leaf,
  Utensils,
  Image,
  Grid3X3,
  Grid2X2,
  LayoutGrid
} from 'lucide-react';
import type { Category } from '@/store/slices/categoriesSlice';

export const Categories: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user: currentUser, canManageVeg, canManageNonVeg } = useAuth();
  const { categories, parentCategories, isLoading, error } = useAppSelector((state) => state.categories);
  const { showAlert } = useAlert();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'2' | '3' | '4'>('3');

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    dispatch(fetchCategories({}));
    // Only fetch parent categories if we don't have them already
    if (parentCategories.length === 0) {
      dispatch(fetchParentCategories());
    }
  }, [dispatch, parentCategories.length]);

  // Handler functions
  const handleView = (category: Category) => {
    navigate(`/categories/${category._id}`);
  };

  const handleEdit = (category: Category) => {
    navigate(`/categories/${category._id}/edit`);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete({ id: category._id, name: category.name });
    setDeleteConfirmOpen(true);
  };

  const handleAddNew = () => {
    navigate('/categories/new');
  };

  const resetDeleteState = () => {
    setDeleteConfirmOpen(false);
    setCategoryToDelete(null);
  };

  const getGridCols = () => {
    switch (viewMode) {
      case '2': return 'grid-cols-1 md:grid-cols-2';
      case '3': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '4': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      try {
        await dispatch(deleteCategory(categoryToDelete.id)).unwrap();
        showAlert('Category deleted successfully!', 'success', 'Delete Complete');
        // Refresh the categories list
        dispatch(fetchCategories({}));
        resetDeleteState();
      } catch (error: any) {
        console.error('Delete error:', error);
        showAlert(
          error?.message || error || 'Failed to delete category',
          'error',
          'Delete Failed'
        );
      }
    }
  };

  const filteredCategories = categories.filter(category => {
    // Only show menu categories (not parent categories) - same as Menu.tsx dropdown
    if (category.type !== 'menu') return false;

    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Role-based filtering - same logic as Menu.tsx
    let matchesRole = true;
    if (currentUser?.role === 'veg-admin') {
      // For veg-admin, show vegetarian categories or categories under vegetarian parent
      matchesRole = category.isVegetarian === true || category.parentCategory?.isVegetarian === true;
    } else if (currentUser?.role === 'non-veg-admin') {
      // For non-veg-admin, show non-vegetarian categories or categories under non-vegetarian parent
      matchesRole = category.isVegetarian === false || category.parentCategory?.isVegetarian === false;
    }

    const matchesType = selectedType === 'all' ||
                       (selectedType === 'veg' && (category.isVegetarian || category.parentCategory?.isVegetarian)) ||
                       (selectedType === 'non-veg' && (!category.isVegetarian && !category.parentCategory?.isVegetarian));

    return matchesSearch && matchesRole && matchesType;
  });

  // Prepare export data (after filteredCategories is defined)
  const exportData = filteredCategories.map(category => ({
    name: category.name,
    parentCategory: category.parentCategory?.name || 'N/A',
    description: category.description,
    status: category.isActive ? 'Active' : 'Inactive',
    dietType: category.parentCategory?.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian',
    menuItems: category.menuItemCount || 0,
    sortOrder: category.sortOrder,
    created: new Date(category.createdAt).toLocaleDateString(),
  }));

  const exportColumns = [
    { key: 'name', label: 'Category Name' },
    { key: 'parentCategory', label: 'Parent Category' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'dietType', label: 'Diet Type' },
    { key: 'menuItems', label: 'Menu Items' },
    { key: 'sortOrder', label: 'Sort Order' },
    { key: 'created', label: 'Created' },
  ];

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
    if (currentUser?.role === 'veg-admin') return category.parentCategory?.isVegetarian === true;
    if (currentUser?.role === 'non-veg-admin') return category.parentCategory?.isVegetarian === false;
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
        <div>
          <h1 className="text-2xl font-bold">Menu Categories</h1>
          <p className="text-muted-foreground">Manage categories for your menu items (starters, main course, beverages, etc.)</p>
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
            filename="categories"
            title="Categories Report"
            subtitle="Export categories data"
          />
          {(canManageVeg() || canManageNonVeg()) && (
            <Button size="sm" onClick={handleAddNew}>
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
             
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div className={`grid ${getGridCols()} gap-6`}>
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
                <Badge className={getTypeBadgeColor(category.parentCategory?.isVegetarian || false)}>
                  {category.parentCategory?.isVegetarian ? (
                    <>
                      <Leaf className="h-3 w-3 mr-1" />
                      Vegetarian
                    </>
                  ) : (
                    <>
                      <Utensils className="h-3 w-3 mr-1" />
                      Non-Vegetarian
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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleView(category)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {canManageCategory(category) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(category)}
                    >
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
              <Button className="mt-4" onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetDeleteState}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
