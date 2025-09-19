import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { createCategory, updateCategory, fetchCategoryById, fetchParentCategories } from '@/store/slices/categoriesSlice';
import {
  ArrowLeft,
  Upload,
  X,
  Save,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useAlert } from '@/hooks/useAlert';

// Form validation schema for menu categories
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description cannot exceed 500 characters'),
  parentCategory: z.string().min(1, 'Parent category is required'),
  sortOrder: z.number().min(0, 'Sort order must be non-negative').optional(),
  isActive: z.boolean().default(true),
});

// Create a dynamic schema that makes parentCategory optional for non-super-admin users
const createCategorySchema = (userRole: string | undefined) => {
  if (userRole === 'super-admin') {
    return categorySchema;
  }
  // For veg/non-veg admins, parentCategory is auto-set so make it optional in validation
  return categorySchema.extend({
    parentCategory: z.string().optional(),
  });
};

type CategoryFormData = z.infer<typeof categorySchema>;

export const AddCategory: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const { user: currentUser } = useAuth();
  const { parentCategories, currentCategory, isLoading } = useAppSelector((state) => state.categories);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null); // Track image to delete from Cloudinary
  const [hasExistingImage, setHasExistingImage] = useState(false); // Track if category has existing image
  const [isDragOver, setIsDragOver] = useState(false); // Track drag over state for file upload

  const isEditMode = !!id;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<CategoryFormData>({
    resolver: zodResolver(createCategorySchema(currentUser?.role)),
    defaultValues: {
      name: '',
      description: '',
      parentCategory: '',
      sortOrder: 0,
      isActive: true,
    }
  });

  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchParentCategories());
    if (isEditMode && id) {
      dispatch(fetchCategoryById(id));
    }
  }, [dispatch, id, isEditMode]);

  // Auto-set parent category for veg/non-veg admins
  useEffect(() => {
    if (!isEditMode && parentCategories.length > 0 && currentUser?.role !== 'super-admin') {
      const autoParentCategory = parentCategories.find(parent => {
        if (currentUser?.role === 'veg-admin') return parent.isVegetarian === true;
        if (currentUser?.role === 'non-veg-admin') return parent.isVegetarian === false;
        return false;
      });

      if (autoParentCategory && !watch('parentCategory')) {
        setValue('parentCategory', autoParentCategory._id);
      }
    }
  }, [parentCategories, currentUser, isEditMode, setValue, watch]);
  // Populate form when currentCategory is loaded in edit mode
  useEffect(() => {
    if (isEditMode && currentCategory && currentCategory._id === id && parentCategories.length > 0) {
      // Handle parentCategory - it might be a string ID or an object with _id
      let parentCategoryId = '';
      if (currentCategory.parentCategory) {
        if (typeof currentCategory.parentCategory === 'string') {
          parentCategoryId = currentCategory.parentCategory;
        } else if (currentCategory.parentCategory._id) {
          parentCategoryId = currentCategory.parentCategory._id;
        }
      }

      // Verify that the parent category exists in the loaded parent categories
      const parentExists = parentCategories.some(parent => parent._id === parentCategoryId);

      reset({
        name: currentCategory.name || '',
        description: currentCategory.description || '',
        parentCategory: parentExists ? parentCategoryId : '',
        sortOrder: currentCategory.sortOrder || 0,
        isActive: currentCategory.isActive ?? true,
      });
      if (currentCategory.image?.url) {
        setImagePreview(currentCategory.image.url);
        setHasExistingImage(true);
      } else {
        setImagePreview(null);
        setHasExistingImage(false);
      }
      // Reset image deletion state
      setImageToDelete(null);
      setSelectedImage(null);
    }
  }, [currentCategory, id, isEditMode, reset, parentCategories]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert(`File ${file.name} is not a valid image format`, 'error', 'Invalid File');
      return;
    }

    // Validate file size (1MB limit)
    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    if (file.size > maxSize) {
      showAlert(`File ${file.name} is too large. Maximum size is 1MB`, 'error', 'File Too Large');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers for file upload
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0]; // Only take the first file for category
      processImageFile(file);
    }
  };

  const removeImage = () => {
    if (hasExistingImage && currentCategory?.image?.url) {
      // This is an existing image, mark it for deletion
      setImageToDelete(currentCategory.image.url);
      setHasExistingImage(false);
    }

    // Clear current image state
    setSelectedImage(null);
    setImagePreview(null);

    // In edit mode, show a reminder that a new image is required
    if (isEditMode) {
      showAlert('Please upload a new image. Category image is required.', 'warning', 'Image Required');
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Find the selected parent category to get its vegetarian status
      let selectedParent = data.parentCategory ? parentCategories.find(p => p._id === data.parentCategory) : null;
      let parentCategoryId = data.parentCategory;
      let isVegetarian = false;



      // If no parent category in form data (for veg/non-veg admins), use the current category's parent or auto-detect
      if (!selectedParent && isEditMode && currentCategory?.parentCategory) {
        // currentCategory.parentCategory is a string ID, so find the parent in parentCategories
        const currentParentId = typeof currentCategory.parentCategory === 'string'
          ? currentCategory.parentCategory
          : currentCategory.parentCategory._id;

        selectedParent = parentCategories.find(p => p._id === currentParentId);
        if (selectedParent) {
          parentCategoryId = selectedParent._id;
          isVegetarian = selectedParent.isVegetarian;
        }

      } else if (!selectedParent && currentUser?.role !== 'super-admin') {
        // Auto-detect for veg/non-veg admins
        selectedParent = parentCategories.find(parent => {
          if (currentUser?.role === 'veg-admin') return parent.isVegetarian === true;
          if (currentUser?.role === 'non-veg-admin') return parent.isVegetarian === false;
          return false;
        });
        if (selectedParent) {
          parentCategoryId = selectedParent._id;
          isVegetarian = selectedParent.isVegetarian;
        }

      } else if (selectedParent) {
        isVegetarian = selectedParent.isVegetarian;

      }



      // Add form fields
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('type', 'menu'); // Always menu type
      formData.append('parentCategory', parentCategoryId);
      formData.append('isVegetarian', isVegetarian.toString()); // Add isVegetarian field
      formData.append('sortOrder', data.sortOrder?.toString() || '0');
      formData.append('isActive', data.isActive.toString());

      // Handle image upload/deletion
      if (selectedImage) {
        formData.append('categoryImage', selectedImage);
      } else if (!isEditMode) {
        // For create mode, image is required
        showAlert('Category image is required', 'error', 'Validation Error');
        setIsSubmitting(false);
        return;
      }

      // For edit mode: image is always required - either new image or existing image must be present
      if (isEditMode && !selectedImage && !hasExistingImage) {
        showAlert('Category image is required. Please upload a new image.', 'error', 'Validation Error');
        setIsSubmitting(false);
        return;
      }

      // Add image to delete if user removed existing image
      if (imageToDelete) {
        formData.append('imageToDelete', imageToDelete);
      }

      if (isEditMode && currentCategory) {
        await dispatch(updateCategory({
          categoryId: currentCategory._id,
          categoryData: formData
        })).unwrap();

        // Clear image deletion state after successful update
        setImageToDelete(null);
      } else {
        await dispatch(createCategory(formData)).unwrap();
      }

      showAlert(
        `Category ${isEditMode ? 'updated' : 'created'} successfully!`,
        'success',
        'Success'
      );

      navigate('/categories');
    } catch (error: any) {
      console.error('Form submission error:', error);
      showAlert(
        error?.message || error || `Failed to ${isEditMode ? 'update' : 'create'} category`,
        'error',
        'Error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter parent categories based on user role
  const filteredParentCategories = parentCategories.filter(parent => {
    if (currentUser?.role === 'super-admin') return true;
    if (currentUser?.role === 'veg-admin') return parent.isVegetarian === true;
    if (currentUser?.role === 'non-veg-admin') return parent.isVegetarian === false;
    return false;
  });

  // Show loading state in edit mode until all data is populated
  if (isEditMode && (isLoading || !currentCategory || currentCategory._id !== id || parentCategories.length === 0)) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/categories')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Button>
        </div>

        {/* Loading State */}
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading category data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditMode && !currentCategory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/categories')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Category not found</p>
              <Button onClick={() => navigate('/categories')}>
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Categories
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Menu Category' : 'Add New Menu Category'}</CardTitle>
            <CardDescription>
              {isEditMode ? 'Update menu category information' : 'Create a new category for your menu items (e.g., Starters, Main Course, Beverages)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Parent Category - Only show for super-admin */}
            {currentUser?.role === 'super-admin' && (
              <div className="space-y-2">
                <Label htmlFor="parentCategory">
                  Parent Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch('parentCategory')}
                  onValueChange={(value) => setValue('parentCategory', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (Veg/Non-Veg)" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredParentCategories.map((parent) => (
                      <SelectItem key={parent._id} value={parent._id}>
                        {parent.name} ({parent.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parentCategory && (
                  <p className="text-sm text-destructive">{errors.parentCategory.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Choose whether this category belongs to Vegetarian or Non-Vegetarian menu section
                </p>
              </div>
            )}

            {/* Category Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Starters, Main Course, Beverages"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe this category and what types of items it contains"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Category Image</CardTitle>
            <CardDescription>Upload an image for this category (required)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50 border-solid'
                    : isEditMode && !imagePreview
                      ? 'border-destructive bg-destructive/5 hover:border-destructive/70'
                      : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop an image here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, GIF up to 1MB
                      </p>
                      {isEditMode && (
                        <p className="text-sm text-destructive font-medium">
                          ⚠️ Image is required - please upload a new image
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('image-upload')?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Image
                    </Button>
                  </div>
                )}
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure category settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                {...register('sortOrder', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.sortOrder && (
                <p className="text-sm text-destructive">{errors.sortOrder.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first in the list
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
              <Label htmlFor="isActive">Active Category</Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/categories')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Category' : 'Create Category'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddCategory;
