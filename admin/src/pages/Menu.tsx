import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMenuItems, deleteMenuItem } from '@/store/slices/menuSlice';
import { useAlert } from '@/hooks/useAlert';
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
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { user: currentUser, canManageVeg, canManageNonVeg, canManageMenuItem } = useAuth();
  const { menuItems, isLoading, error } = useAppSelector((state) => state.menu);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    dispatch(fetchMenuItems({}));
  }, [dispatch]);

  const handleExport = () => {
    try {
      // Create CSV content
      const headers = ['Name', 'Description', 'Category', 'Type', 'MRP', 'Discounted Price', 'Quantity', 'Status'];
      const csvContent = [
        headers.join(','),
        ...menuItems.map(item => [
          `"${item.name}"`,
          `"${item.description}"`,
          `"${item.category.name}"`,
          item.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian',
          item.mrp,
          item.discountedPrice,
          item.quantity,
          item.isActive ? 'Active' : 'Inactive'
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `menu-items-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showAlert('Menu items exported successfully!', 'success', 'Export Complete');
    } catch (error) {
      showAlert('Failed to export menu items', 'error', 'Export Failed');
    }
  };

  const handleEdit = (menuItemId: string) => {
    navigate(`/menu/edit/${menuItemId}`);
  };

  const handleView = (menuItemId: string) => {
    navigate(`/menu/view/${menuItemId}`);
  };

  const handleDelete = (menuItemId: string) => {
    const menuItem = menuItems.find(item => item._id === menuItemId);
    if (menuItem) {
      setItemToDelete({ id: menuItemId, name: menuItem.name });
      setDeleteConfirmOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await dispatch(deleteMenuItem(itemToDelete.id)).unwrap();
        showAlert('Menu item deleted successfully!', 'success', 'Delete Complete');
        // Refresh the menu items list
        dispatch(fetchMenuItems({}));
        resetDeleteState();
      } catch (error: any) {
        showAlert(error || 'Failed to delete menu item', 'error', 'Delete Failed');
        resetDeleteState();
      }
    }
  };

  const resetDeleteState = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const filteredMenuItems = menuItems.filter(menuItem => {
    // Check if menuItem and required properties exist
    if (!menuItem || !menuItem.name) {
      return false;
    }

    const matchesSearch = menuItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         menuItem.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Role-based filtering
    let matchesRole = true;
    if (currentUser?.role === 'veg-admin') {
      matchesRole = menuItem.isVegetarian === true;
    } else if (currentUser?.role === 'non-veg-admin') {
      matchesRole = menuItem.isVegetarian === false;
    }

    const matchesCategory = selectedCategory === 'all' || menuItem.category?.toString() === selectedCategory;
    const matchesType = selectedType === 'all' ||
                       (selectedType === 'veg' && menuItem.isVegetarian) ||
                       (selectedType === 'non-veg' && !menuItem.isVegetarian);

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
          <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant menu items and categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Menu
          </Button>
          {canAddMenuItem() && (
            <Button size="sm" asChild>
              <Link to="/menu/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Link>
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
        {filteredMenuItems.map((menuItem) => (
          <Card key={menuItem._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {menuItem.isVegetarian ? (
                      <Leaf className="h-4 w-4 text-green-600" />
                    ) : (
                      <Utensils className="h-4 w-4 text-red-600" />
                    )}
                    {menuItem.name}
                    {menuItem.averageRating && menuItem.averageRating > 4 && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">{menuItem.category?.name || 'No Category'}</CardDescription>
                </div>
                <Badge className={getTypeBadgeColor(menuItem.isVegetarian)}>
                  {menuItem.isVegetarian ? 'Veg' : 'Non-Veg'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {menuItem.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {menuItem.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">${menuItem.discountedPrice || 0}</span>
                  {menuItem.mrp && menuItem.discountedPrice && menuItem.mrp > menuItem.discountedPrice && (
                    <span className="text-sm text-muted-foreground line-through">${menuItem.mrp}</span>
                  )}
                </div>
                <Badge className={getStatusBadgeColor(menuItem.isActive)}>
                  {menuItem.isActive ? 'Available' : 'Out of Stock'}
                </Badge>
              </div>
              


              {menuItem.preparationTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {menuItem.preparationTime} mins
                </div>
              )}

              {menuItem.averageRating && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span>{menuItem.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({menuItem.totalReviews || 0} reviews)</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Added: {menuItem.createdAt ? new Date(menuItem.createdAt).toLocaleDateString() : 'Unknown'}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleView(menuItem._id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {canManageMenuItem(menuItem.isVegetarian) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(menuItem._id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(menuItem._id)}
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

      {filteredMenuItems.length === 0 && (
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
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
