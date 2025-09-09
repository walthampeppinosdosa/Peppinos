import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useAppDispatch } from '@/store';
import { deleteCategory } from '@/store/slices/categoriesSlice';
import { useAlert } from '@/hooks/useAlert';
import { Leaf, Utensils, AlertTriangle } from 'lucide-react';
import type { Category } from '@/store/slices/categoriesSlice';

interface DeleteCategoryDialogProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteCategoryDialog: React.FC<DeleteCategoryDialogProps> = ({
  category,
  isOpen,
  onClose,
  onSuccess
}) => {
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!category) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      await dispatch(deleteCategory(category._id)).unwrap();
      
      showAlert(
        `Category "${category.name}" has been deleted successfully!`,
        'success',
        'Category Deleted'
      );
      
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      showAlert(
        error || 'Failed to delete category',
        'error',
        'Delete Failed'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeBadgeColor = (isVegetarian: boolean) => {
    return isVegetarian 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const hasMenuItems = (category.menuItemCount || 0) > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Category
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete this category? This action cannot be undone.
              </p>
              
              {/* Category Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    {category.image?.url ? (
                      <img 
                        src={category.image.url} 
                        alt={category.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : category.isVegetarian ? (
                      <Leaf className="h-4 w-4 text-green-600" />
                    ) : (
                      <Utensils className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">{category.slug}</p>
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
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium capitalize">{category.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Menu Items:</span>
                    <span className="ml-2 font-medium">{category.menuItemCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Warning for categories with menu items */}
              {hasMenuItems && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">Warning!</p>
                      <p className="text-destructive/80">
                        This category has {category.menuItemCount} menu item{category.menuItemCount !== 1 ? 's' : ''} associated with it. 
                        You cannot delete this category until all menu items are removed or moved to another category.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Parent category warning */}
              {category.type === 'parent' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-900/20 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">Parent Category</p>
                      <p className="text-amber-700 dark:text-amber-300">
                        Deleting this parent category may affect related menu categories and items.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || hasMenuItems}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Category'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCategoryDialog;
