import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Trash2, Leaf, Utensils, Calendar, Hash, Image as ImageIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchCategoryById, fetchParentCategories } from '@/store/slices/categoriesSlice';
import { useAuth } from '@/hooks/useAuth';
import DeleteCategoryDialog from '@/components/categories/DeleteCategoryDialog';

export const ViewCategory: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  const { currentCategory, parentCategories, isLoading, error } = useAppSelector((state) => state.categories);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchCategoryById(id));
    }
    // Only fetch parent categories if we don't have them already
    if (parentCategories.length === 0) {
      dispatch(fetchParentCategories());
    }
  }, [dispatch, id, parentCategories.length]);

  const canManageCategory = (category: any) => {
    if (currentUser?.role === 'super-admin') return true;

    // Find the parent category to get its vegetarian status
    // category.parentCategory can be either a string ID or an object
    const parentCategoryId = typeof category.parentCategory === 'string'
      ? category.parentCategory
      : category.parentCategory?._id;
    const parentCategory = parentCategories.find(p => p._id === parentCategoryId);

    if (currentUser?.role === 'veg-admin') return parentCategory?.isVegetarian === true;
    if (currentUser?.role === 'non-veg-admin') return parentCategory?.isVegetarian === false;
    return false;
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = () => {
    navigate(`/categories/${id}/edit`);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    navigate('/categories');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !currentCategory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/categories')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-2">
                {error || 'Category not found'}
              </p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/categories')}
              >
                Back to Categories
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/categories')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentCategory.name}</h1>
            <p className="text-muted-foreground">{currentCategory.slug}</p>
          </div>
        </div>
        
        {canManageCategory(currentCategory) && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Category Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                {currentCategory.image?.url ? (
                  <img 
                    src={currentCategory.image.url} 
                    alt={currentCategory.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : currentCategory.isVegetarian ? (
                  <Leaf className="h-6 w-6 text-green-600" />
                ) : (
                  <Utensils className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl">{currentCategory.name}</CardTitle>
                <CardDescription>{currentCategory.slug}</CardDescription>
              </div>
            </div>
            {(() => {
              // currentCategory.parentCategory is a string ID, so we need to find the matching parent
              const parentCategoryId = typeof currentCategory.parentCategory === 'string'
                ? currentCategory.parentCategory
                : currentCategory.parentCategory?._id;
              const parentCategory = parentCategories.find(p => p._id === parentCategoryId);
              const isVegetarian = parentCategory?.isVegetarian || false;
              return (
                <Badge className={getTypeBadgeColor(isVegetarian)}>
                  {isVegetarian ? (
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
              );
            })()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Image */}
          {currentCategory.image?.url && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Category Image</h3>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={currentCategory.image.url}
                  alt={currentCategory.name}
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Category Type</label>
                <p className="text-sm font-medium capitalize">{currentCategory.type}</p>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusBadgeColor(currentCategory.isActive)}>
                    {currentCategory.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {currentCategory.parentCategory && (
                <div>
                  <label className="text-xs text-muted-foreground">Parent Category</label>
                  <p className="text-sm font-medium">{currentCategory.parentCategory.name}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Sort Order</label>
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{currentCategory.sortOrder || 0}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Menu Items</label>
                <p className="text-sm font-medium">{currentCategory.menuItemCount || 0} items</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {currentCategory.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentCategory.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Timeline</h3>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{formatDate(currentCategory.createdAt)}</span>
              </div>
              
              {currentCategory.updatedAt && currentCategory.updatedAt !== currentCategory.createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">{formatDate(currentCategory.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteCategoryDialog
        category={currentCategory}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default ViewCategory;
