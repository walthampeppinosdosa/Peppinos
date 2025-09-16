import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMenuItems, deleteMenuItem } from '@/store/slices/menuSlice';
import { fetchCategories } from '@/store/slices/categoriesSlice';
import { useAlert } from '@/hooks/useAlert';
import { formatters } from '@/utils/exportUtils';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Clock,
  Star,
  Leaf,
  Utensils,
  DollarSign,
  Package,
  X,
  Grid3X3,
  Grid2X2,
  LayoutGrid
} from 'lucide-react';

export const Menu: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { user: currentUser, canManageVeg, canManageNonVeg, canManageMenuItem } = useAuth();
  const { menuItems, isLoading, error, pagination } = useAppSelector((state) => state.menu);
  const { categories } = useAppSelector((state) => state.categories);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'2' | '3' | '4'>('3');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset pagination when search changes
    }, 1000); // 1000ms delay to reduce API calls

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    // Only fetch if we have valid parameters
    if (currentPage > 0 && itemsPerPage > 0) {
      dispatch(fetchMenuItems({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm,
        category: selectedCategory !== 'all' ? selectedCategory : '',
        isVegetarian: selectedType !== 'all' ? selectedType === 'veg' : '',
        isActive: selectedStatus !== 'all' ? selectedStatus === 'active' : '',
        sortBy: sortBy === 'name' ? 'name' : sortBy === 'price' ? 'discountedPrice' : 'createdAt',
        sortOrder: 'desc'
      }));
    }
  }, [dispatch, currentPage, itemsPerPage, debouncedSearchTerm, selectedCategory, selectedType, selectedStatus, sortBy]);

  useEffect(() => {
    // Fetch only menu categories for the dropdown
    dispatch(fetchCategories({ type: 'menu' }));
  }, [dispatch]);

  // Debug categories for super admin
  useEffect(() => {
    if (currentUser?.role === 'super-admin' && categories.length > 0) {
     
      const vegCategories = categories.filter(cat => cat.type === 'menu' && (cat.isVegetarian === true || cat.parentCategory?.isVegetarian === true));
   
    }
  }, [categories, currentUser]);

  // Debug menu items to check for the "0" issue
  useEffect(() => {
    if (menuItems.length > 0) {
      console.log('Menu items data:', menuItems.slice(0, 2)); // Log first 2 items
    }
  }, [menuItems]);

  // Export configuration
  const exportColumns = [
    { key: 'name', label: 'Name', width: 30 },
    { key: 'description', label: 'Description', width: 40, formatter: formatters.truncate(50) },
    { key: 'category', label: 'Category', width: 25, formatter: (value: any) => value?.name || 'No Category' },
    { key: 'isVegetarian', label: 'Type', width: 20, formatter: formatters.vegetarian },
    { key: 'mrp', label: 'MRP', width: 15, formatter: formatters.currency },
    { key: 'discountedPrice', label: 'Discounted Price', width: 20, formatter: formatters.currency },
    { key: 'quantity', label: 'Quantity', width: 15 },
    { key: 'isActive', label: 'Status', width: 15, formatter: formatters.status },
    { key: 'createdAt', label: 'Created Date', width: 20, formatter: formatters.date }
  ];

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
        // Refresh the menu items list with current pagination
        dispatch(fetchMenuItems({
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
          category: selectedCategory !== 'all' ? selectedCategory : '',
          isVegetarian: selectedType !== 'all' ? selectedType === 'veg' : '',
          isActive: selectedStatus !== 'all' ? selectedStatus === 'active' : '',
          sortBy: sortBy === 'name' ? 'name' : sortBy === 'price' ? 'discountedPrice' : 'createdAt',
          sortOrder: 'desc'
        }));
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

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Filter change handlers that reset pagination
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const getGridCols = () => {
    switch (viewMode) {
      case '2': return 'grid-cols-1 md:grid-cols-2';
      case '3': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '4': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  // Since we're now doing server-side filtering and sorting, we can use menuItems directly
  const filteredMenuItems = menuItems;

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
            data={filteredMenuItems}
            columns={exportColumns}
            filename="menu-items"
            title="Menu Items Export"
            subtitle={`Total items: ${filteredMenuItems.length}`}
          />
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
            <div className="flex gap-2 items-center">
              {currentUser?.role === 'super-admin' && (
                <Select value={selectedType} onValueChange={(value) => {
                  setSelectedType(value);
                  // Reset category selection when type changes
                  setSelectedCategory('all');
                }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {currentUser?.role === 'super-admin' && selectedType === 'all' ? (
                    <SelectItem value="select-type-first" disabled>
                      Select type first to see categories
                    </SelectItem>
                  ) : (
                    categories
                      .filter(category => {
                        // Only show menu categories (not parent categories)
                        if (category.type !== 'menu') return false;

                        // Filter categories based on user role
                        if (currentUser?.role === 'veg-admin') {
                          return category.isVegetarian === true || category.parentCategory?.isVegetarian === true;
                        } else if (currentUser?.role === 'non-veg-admin') {
                          return category.isVegetarian === false || category.parentCategory?.isVegetarian === false;
                        }

                        // For super-admin, filter by selected type
                        if (currentUser?.role === 'super-admin') {
                          if (selectedType === 'veg') {
                            return category.isVegetarian === true || category.parentCategory?.isVegetarian === true;
                          } else if (selectedType === 'non-veg') {
                            return category.isVegetarian === false || category.parentCategory?.isVegetarian === false;
                          }
                        }

                        return true;
                      })
                      .map(category => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="mt-2.5 h-10"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'More Filters'}
              </Button>
              {(searchTerm || selectedCategory !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || selectedPriceRange !== 'all' || sortBy !== 'name') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedType('all');
                    setSelectedStatus('all');
                    setSelectedPriceRange('all');
                    setSortBy('name');
                    setCurrentPage(1);
                  }}
                  className="h-10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Additional Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={selectedStatus} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range</label>
                  <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Prices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="0-10">$0 - $10</SelectItem>
                      <SelectItem value="10-20">$10 - $20</SelectItem>
                      <SelectItem value="20+">$20+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="created">Date Created</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setShowFilters(false)}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      <div className={`grid ${getGridCols()} gap-6`}>
        {filteredMenuItems.map((menuItem) => (
          <Card key={menuItem._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2 mb-1">
                    {menuItem.isVegetarian ? (
                      <Leaf className="h-4 w-4 text-green-600" />
                    ) : (
                      <Utensils className="h-4 w-4 text-red-600" />
                    )}
                    <span className="flex-1">{menuItem.name}</span>
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

              {/* Rating and Preparation Time Row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {menuItem.preparationTime && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{menuItem.preparationTime} mins</span>
                    </div>
                  )}

                  {menuItem.averageRating && menuItem.averageRating > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Rating:</span>
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{menuItem.averageRating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">
                        ({menuItem.totalReviews || 0} {menuItem.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  )}
                </div>

                {/* High Rating Badge */}
                {menuItem.averageRating && menuItem.averageRating > 4 && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Top Rated
                  </Badge>
                )}
              </div>

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

      {filteredMenuItems.length == 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No menu items found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || selectedPriceRange !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No menu items have been added yet.'}
            </p>
            {canAddMenuItem() && (
              <Button className="mt-4" asChild>
                <Link to="/menu/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Menu Item
                  {getDefaultCategory() && ` (${getDefaultCategory()})`}
                </Link>
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} menu items
            </span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage >= pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
