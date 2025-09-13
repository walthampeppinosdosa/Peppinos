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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { createMenuItem, updateMenuItem, fetchMenuItemById, clearCurrentMenuItem } from '@/store/slices/menuSlice';
import { fetchCategories, fetchParentCategories } from '@/store/slices/categoriesSlice';
import { fetchSpicyLevelsByCategory } from '@/store/slices/spicyLevelSlice';
import { fetchPreparationsByCategory } from '@/store/slices/preparationSlice';
import { InlineItemManager } from '@/components/menu/InlineItemManager';
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Minus,
  Save,
  Loader2,
  GripVertical
} from 'lucide-react';
import { useAlert } from '@/hooks/useAlert';

// Form validation schema
const menuItemSchema = z.object({
  name: z.string().min(1, 'Menu item name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description cannot exceed 1000 characters'),
  parentCategory: z.string().optional(), // Only for super-admin
  category: z.string().min(1, 'Category is required'),
  mrp: z.number().min(0, 'MRP must be positive'),
  discountedPrice: z.number().min(0, 'Discounted price must be positive'),
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
  sizes: z.array(z.object({
    name: z.string().min(1, 'Size name is required'),
    price: z.coerce.number().min(0, 'Size price must be 0 or greater'),
    isDefault: z.boolean().optional().default(false)
  })).min(1, 'At least one size must be selected').refine(
    (sizes) => sizes.every(size => size.name && size.price >= 0),
    { message: 'All sizes must have valid names and prices' }
  ),
  spicyLevel: z.array(z.string()).optional(),
  preparation: z.array(z.string()).optional(),
  preparationTime: z.number().min(1, 'Preparation time must be at least 1 minute'),
  specialInstructions: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface Addon {
  name: string;
  price: number;
}

export const AddMenuItem: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const { user, isSuperAdmin } = useAuth();
  const { categories, parentCategories } = useAppSelector((state) => state.categories);
  const { isLoading: menuLoading, currentMenuItem } = useAppSelector((state) => state.menu);
  const { spicyLevels } = useAppSelector((state) => state.spicyLevels);

  // Determine if this is edit mode
  const isEditMode = !!id;

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [newAddon, setNewAddon] = useState<Addon>({ name: '', price: 0 });
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('');
  const [customErrors, setCustomErrors] = useState<{[key: string]: string}>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]); // Track images to delete from Cloudinary
  const [imageMetadata, setImageMetadata] = useState<Array<{url: string, isNew: boolean, file?: File}>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
    clearErrors
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      quantity: 1,
      sizes: [],
      spicyLevel: [],
      preparation: [],
      preparationTime: 15,
      tags: []
    }
  });

  const watchedMrp = watch('mrp');
  const watchedDiscountedPrice = watch('discountedPrice');
  const watchedCategory = watch('category');

  // Fetch menu item data when in edit mode
  useEffect(() => {
    if (isEditMode && id && (!currentMenuItem || currentMenuItem._id !== id)) {
      dispatch(fetchMenuItemById(id));
    }
  }, [dispatch, id, isEditMode, currentMenuItem]);

  // Populate form when currentMenuItem is loaded in edit mode
  useEffect(() => {
    if (isEditMode && currentMenuItem && currentMenuItem._id === id && categories.length > 0 && parentCategories.length > 0) {

      // Populate basic form fields
      setValue('name', currentMenuItem.name);
      setValue('description', currentMenuItem.description);
      setValue('mrp', currentMenuItem.mrp || 0);
      setValue('discountedPrice', currentMenuItem.discountedPrice || 0);
      setValue('quantity', currentMenuItem.quantity || 1);
      setValue('preparationTime', currentMenuItem.preparationTime || 15);

      // Handle category - it might be a string ID or an object with _id
      let categoryId = '';
      if (currentMenuItem.category) {
        if (typeof currentMenuItem.category === 'string') {
          categoryId = currentMenuItem.category;
        } else if (currentMenuItem.category._id) {
          categoryId = currentMenuItem.category._id;
        }
      }

      // Verify that the category exists in the loaded categories before setting it
      if (categoryId) {
        const categoryExists = categories.some(cat => cat._id === categoryId);
        if (categoryExists) {
          setValue('category', categoryId);
        }
      }

      // Set parent category based on menu item's isVegetarian property
      if (currentMenuItem.isVegetarian !== undefined) {
        // Find the appropriate parent category from parentCategories
        const parentCategory = parentCategories.find(parent =>
          parent.isVegetarian === currentMenuItem.isVegetarian
        );

        if (parentCategory) {
          setSelectedParentCategory(parentCategory._id);
          setValue('parentCategory', parentCategory._id);
        }
      }

      // Set spicy levels
      if (currentMenuItem.spicyLevel) {
        if (Array.isArray(currentMenuItem.spicyLevel)) {
          const spicyLevelIds = currentMenuItem.spicyLevel.map((level: any) =>
            typeof level === 'string' ? level : level._id || level.name
          );
          setValue('spicyLevel', spicyLevelIds);
        } else {
          // Handle single spicy level value
          const singleLevel = typeof currentMenuItem.spicyLevel === 'string'
            ? currentMenuItem.spicyLevel
            : (currentMenuItem.spicyLevel as any)?._id || (currentMenuItem.spicyLevel as any)?.name;
          setValue('spicyLevel', [singleLevel]);
        }
      }

      // Set preparations

      if (currentMenuItem.preparations) {
        if (Array.isArray(currentMenuItem.preparations)) {
          const preparationIds = currentMenuItem.preparations.map((prep: any) =>
            typeof prep === 'string' ? prep : prep._id || prep.name
          );
          setValue('preparation', preparationIds);
        } else {
          // Handle single preparation value
          const singlePrep = typeof currentMenuItem.preparations === 'string'
            ? currentMenuItem.preparations
            : (currentMenuItem.preparations as any)?._id || (currentMenuItem.preparations as any)?.name;
          setValue('preparation', [singlePrep]);
        }
      }

      // Set addons
      if (currentMenuItem.addons && currentMenuItem.addons.length > 0) {
        setAddons(currentMenuItem.addons);
      }

      // Set tags
      if (currentMenuItem.tags && currentMenuItem.tags.length > 0) {
        setSelectedTags(currentMenuItem.tags);
      }

      // Set sizes - ensure proper structure

      if (currentMenuItem.sizes && currentMenuItem.sizes.length > 0) {
        const formattedSizes = currentMenuItem.sizes.map((size: any) => {
          const formatted = {
            name: String(size.name || ''),
            price: Number(size.price) || 0,
            isDefault: Boolean(size.isDefault)
          };
          return formatted;
        }).filter(size => {
          const isValid = size.name && size.price >= 0;
          return isValid;
        });

        setValue('sizes', formattedSizes);
      } else {
        // Set a default size if none exist
        setValue('sizes', []);
      }

      // Handle existing images - convert URLs to preview format
      if (currentMenuItem.images && currentMenuItem.images.length > 0) {
        const imageUrls = currentMenuItem.images.map((img: any) =>
          typeof img === 'string' ? img : img.url || img
        );
        setImagePreviews(imageUrls);
        // Initialize image metadata for existing images
        const metadata = imageUrls.map(url => ({
          url,
          isNew: false
        }));
        setImageMetadata(metadata);
        // Note: We can't set selectedImages for existing images since they're URLs, not File objects
      }

      // Set special instructions
      if (currentMenuItem.specialInstructions) {
        setValue('specialInstructions', currentMenuItem.specialInstructions);
      }
    }
  }, [currentMenuItem, isEditMode, id, setValue, categories, parentCategories]);

  // Real-time price validation
  useEffect(() => {
    if (watchedMrp && watchedDiscountedPrice && watchedDiscountedPrice > watchedMrp) {
      setError('discountedPrice', {
        type: 'manual',
        message: 'Discounted price cannot be greater than MRP'
      });
    } else {
      clearErrors('discountedPrice');
    }
  }, [watchedMrp, watchedDiscountedPrice, setError, clearErrors]);

  useEffect(() => {
    // Fetch categories based on user role
    const params: any = { type: 'menu' };

    dispatch(fetchCategories(params));

    // Fetch parent categories for all admin roles (needed for auto-selection)
    dispatch(fetchParentCategories());
  }, [dispatch, user?.role]);

  // Auto-set parent category for role-based admins
  useEffect(() => {
    if (parentCategories.length > 0 && user?.role !== 'super-admin') {
      let autoParentCategory = '';

      if (user?.role === 'veg-admin') {
        // Find the vegetarian parent category
        const vegParent = parentCategories.find(cat => cat.name.toLowerCase().includes('veg') && !cat.name.toLowerCase().includes('non'));
        autoParentCategory = vegParent?._id || '';
      } else if (user?.role === 'non-veg-admin') {
        // Find the non-vegetarian parent category
        const nonVegParent = parentCategories.find(cat => cat.name.toLowerCase().includes('non'));
        autoParentCategory = nonVegParent?._id || '';
      }

      if (autoParentCategory && autoParentCategory !== selectedParentCategory) {
        setSelectedParentCategory(autoParentCategory);
      }
    }
  }, [parentCategories, user?.role, selectedParentCategory]);

  // Fetch spicy levels and preparations when parent category changes
  useEffect(() => {
    if (selectedParentCategory) {
      dispatch(fetchSpicyLevelsByCategory(selectedParentCategory));
      dispatch(fetchPreparationsByCategory(selectedParentCategory));
    }
  }, [dispatch, selectedParentCategory]);

  // Determine if menu item should be vegetarian based on user role and parent category
  const getIsVegetarian = () => {
    if (user?.role === 'veg-admin') return true;
    if (user?.role === 'non-veg-admin') return false;

    // For super-admin, determine from selected parent category
    if (user?.role === 'super-admin' && selectedParentCategory) {
      const parentCategory = parentCategories.find(p => p._id === selectedParentCategory);
      return parentCategory?.isVegetarian || false;
    }

    return true; // Default to vegetarian
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedImages.length > 5) {
      setCustomErrors(prev => ({ ...prev, images: 'Maximum 5 images allowed' }));
      return;
    }

    // Clear image errors when valid images are selected
    setCustomErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.images;
      return newErrors;
    });

    setSelectedImages(prev => [...prev, ...files]);

    // Create previews and metadata
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setImagePreviews(prev => [...prev, url]);
        // Add metadata for new image
        setImageMetadata(prev => [...prev, {
          url,
          isNew: true,
          file
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    // Get the image metadata to check if it's an existing image
    const imageToRemove = imageMetadata[index];

    if (imageToRemove && !imageToRemove.isNew) {
      // This is an existing image, add it to deletion list
      setImagesToDelete(prev => [...prev, imageToRemove.url]);
    }

    // Remove from all arrays
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageMetadata(prev => prev.filter((_, i) => i !== index));

    // Only remove from selectedImages if it's a new image
    if (imageToRemove && imageToRemove.isNew && imageToRemove.file) {
      setSelectedImages(prev => prev.filter(file => file !== imageToRemove.file));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Calculate the correct insert index
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;

    // Reorder imagePreviews
    const newPreviews = [...imagePreviews];
    const draggedPreview = newPreviews[draggedIndex];
    newPreviews.splice(draggedIndex, 1);
    newPreviews.splice(insertIndex, 0, draggedPreview);
    setImagePreviews(newPreviews);

    // Reorder imageMetadata
    const newMetadata = [...imageMetadata];
    const draggedMetadata = newMetadata[draggedIndex];
    newMetadata.splice(draggedIndex, 1);
    newMetadata.splice(insertIndex, 0, draggedMetadata);
    setImageMetadata(newMetadata);

    // Update selectedImages array to match the new order
    const newSelectedImages = newMetadata
      .filter(meta => meta.isNew && meta.file)
      .map(meta => meta.file!);
    setSelectedImages(newSelectedImages);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const addAddon = () => {
    if (newAddon.name && newAddon.price > 0) {
      setAddons(prev => [...prev, newAddon]);
      setNewAddon({ name: '', price: 0 });
    }
  };

  const removeAddon = (index: number) => {
    setAddons(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      const newTags = [...selectedTags, tagInput.trim()];
      setSelectedTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(newTags);
    setValue('tags', newTags);
  };



  const onSubmit = async (data: MenuItemFormData) => {
    // Clear previous custom errors
    setCustomErrors({});

   

    // Validate images - only require new images for create mode
    if (!isEditMode && selectedImages.length === 0) {
      setCustomErrors(prev => ({ ...prev, images: 'At least one image is required' }));
      return;
    }

    // For edit mode, allow no new images if there are existing images
    if (isEditMode && selectedImages.length === 0 && imagePreviews.length === 0) {
      setCustomErrors(prev => ({ ...prev, images: 'At least one image is required' }));
      return;
    }

    // Validate price relationship
    if (data.discountedPrice > data.mrp) {
      setError('discountedPrice', {
        type: 'manual',
        message: 'Discounted price cannot be greater than MRP'
      });
      return;
    }

    // Validate sizes data

    if (!data.sizes || data.sizes.length === 0) {
      setError('sizes', {
        type: 'manual',
        message: 'At least one size must be selected'
      });
      showAlert('Please select at least one size for the menu item', 'error', 'Validation Error');
      return;
    }

    // Check if all sizes have valid data
    const invalidSizes = data.sizes.filter(size =>
      !size.name ||
      size.name.trim() === '' ||
      size.price === undefined ||
      size.price === null ||
      size.price < 0 ||
      isNaN(Number(size.price))
    );

    if (invalidSizes.length > 0) {
      setError('sizes', {
        type: 'manual',
        message: 'All selected sizes must have valid names and prices (0 or greater)'
      });
      showAlert('Please ensure all selected sizes have valid names and prices', 'error', 'Validation Error');
      return;
    }

    const formData = new FormData();

    // Add basic fields
    Object.entries(data).forEach(([key, value]) => {
      // Skip preparation and spicyLevel fields as they're handled separately
      if (key === 'preparation' || key === 'spicyLevel') return;

      if (key === 'tags') {
        formData.append(key, JSON.stringify(value || []));
      } else if (key === 'sizes') {
        // Ensure sizes have proper structure and valid data

        const sizesData = (value as any[])?.map(size => {
          const processedSize = {
            name: String(size.name || '').trim(),
            price: Number(size.price) || 0,
            isDefault: Boolean(size.isDefault)
          };
          return processedSize;
        }).filter(size => size.name && size.price >= 0) || [];


        if (sizesData.length === 0) {
          throw new Error('At least one valid size is required');
        }

        formData.append(key, JSON.stringify(sizesData));
      } else if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value.toString());
      }
    });

    // Add role-based vegetarian status
    formData.append('isVegetarian', getIsVegetarian().toString());

    // Add spicy levels for all items (if selected and not "not-applicable")

    if (data.spicyLevel && data.spicyLevel.length > 0) {
      // Handle both array and stringified array cases
      let spicyLevelArray = data.spicyLevel;

      // If it's a string, try to parse it
      if (typeof data.spicyLevel === 'string') {
        try {
          spicyLevelArray = JSON.parse(data.spicyLevel);
        } catch (e) {
          console.error('Failed to parse spicyLevel string:', data.spicyLevel);
          spicyLevelArray = [data.spicyLevel];
        }
      }

      // Ensure it's an array
      if (!Array.isArray(spicyLevelArray)) {
        spicyLevelArray = [spicyLevelArray];
      }


      // Filter out "not-applicable" values (case insensitive)
      const validSpicyLevels = spicyLevelArray.filter(level => {
        if (!level) return false;
        const levelStr = String(level).toLowerCase().trim();
        const isNotApplicable = levelStr === 'not-applicable' ||
                               levelStr === 'not applicable' ||
                               levelStr === 'notapplicable';
        return !isNotApplicable;
      });


      if (validSpicyLevels.length > 0) {
        formData.append('spicyLevel', JSON.stringify(validSpicyLevels));
      }
    }

    // Add preparations (for both veg and non-veg items)

    if (data.preparation && data.preparation.length > 0) {
      // Handle both array and stringified array cases
      let preparationArray = data.preparation;

      // If it's a string, try to parse it
      if (typeof data.preparation === 'string') {
        try {
          preparationArray = JSON.parse(data.preparation);
        } catch (e) {
          console.error('Failed to parse preparation string:', data.preparation);
          preparationArray = [data.preparation];
        }
      }

      // Ensure it's an array
      if (!Array.isArray(preparationArray)) {
        preparationArray = [preparationArray];
      }


      // Filter out "not-applicable" values (case insensitive)
      const validPreparations = preparationArray.filter(prep => {
        if (!prep) return false;
        const prepStr = String(prep).toLowerCase().trim();
        const isNotApplicable = prepStr === 'not-applicable' ||
                               prepStr === 'not applicable' ||
                               prepStr === 'notapplicable';
        return !isNotApplicable;
      });


      if (validPreparations.length > 0) {
        formData.append('preparation', JSON.stringify(validPreparations));
      }
    }

    // Add addons
    formData.append('addons', JSON.stringify(addons));
    
    // Add images (only new images for edit mode)
    selectedImages.forEach((image) => {
      formData.append('menuItemImages', image);
    });

    // For edit mode, handle existing images and deletions
    if (isEditMode) {
      // Get existing images (not new uploads) in their current order
      const existingImages = imageMetadata
        .filter(meta => !meta.isNew)
        .map(meta => meta.url);

      if (existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      // Add images to delete from Cloudinary
      if (imagesToDelete.length > 0) {
        formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
      }
    }

    try {
      let result;
      if (isEditMode && id) {
        result = await dispatch(updateMenuItem({ id, menuItemData: formData }));
        if (updateMenuItem.fulfilled.match(result)) {
          showAlert('Menu item updated successfully!', 'success', 'Success');
          // Clear images to delete after successful update
          setImagesToDelete([]);
          navigate('/menu');
        } else {
          showAlert(result.payload as string || 'Failed to update menu item', 'error', 'Update Failed');
        }
      } else {
        result = await dispatch(createMenuItem(formData));
        if (createMenuItem.fulfilled.match(result)) {
          showAlert('Menu item created successfully!', 'success', 'Success');
          // Reset form state
          setImagesToDelete([]);
          setImageMetadata([]);
          setImagePreviews([]);
          setSelectedImages([]);
          navigate('/menu');
        } else {
          showAlert(result.payload as string || 'Failed to create menu item', 'error', 'Creation Failed');
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert(
        `${isEditMode ? 'Failed to update menu item' : 'Failed to create menu item'}: ${errorMessage}`,
        'error',
        isEditMode ? 'Update Failed' : 'Creation Failed'
      );
    }
  };

  // Filter categories based on user role and selected parent category
  const filteredCategories = categories.filter(category => {
    // Only show menu categories (not parent categories)
    if (category.type !== 'menu') return false;

    if (user?.role === 'super-admin') {
      // For super-admin, filter by selected parent category if one is selected
      if (selectedParentCategory) {
        return category.parentCategory?._id === selectedParentCategory;
      }
      return true; // Show all if no parent category selected
    }
    if (user?.role === 'veg-admin') return category.parentCategory?.isVegetarian === true;
    if (user?.role === 'non-veg-admin') return category.parentCategory?.isVegetarian === false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/menu')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Menu
        </Button>
      </div>

      <form
        onSubmit={handleSubmit(
          onSubmit,
          (errors) => {
            // Show user-friendly validation errors
            const errorMessages = Object.entries(errors).map(([field, error]) => {
              const fieldName = field === 'sizes' ? 'Sizes' :
                               field === 'mrp' ? 'MRP' :
                               field === 'discountedPrice' ? 'Discounted Price' :
                               field === 'preparationTime' ? 'Preparation Time' :
                               field.charAt(0).toUpperCase() + field.slice(1);

              if (Array.isArray(error)) {
                // Handle array errors (like sizes validation)
                const arrayErrors = error.map((e, index) => {
                  if (typeof e === 'object' && e.message) {
                    return `${fieldName}[${index}]: ${e.message}`;
                  } else if (typeof e === 'object') {
                    // Handle nested object errors (like size name/price validation)
                    const nestedErrors = Object.entries(e).map(([key, value]) =>
                      `${key}: ${(value as any).message || value}`
                    );
                    return `${fieldName}[${index}] - ${nestedErrors.join(', ')}`;
                  }
                  return `${fieldName}[${index}]: ${e}`;
                });
                return arrayErrors.join('; ');
              }

              return `${fieldName}: ${error.message || error}`;
            });
            showAlert(`Please fix the following errors:\n• ${errorMessages.join('\n• ')}`, 'error', 'Validation Error');
          }
        )}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{isEditMode ? 'Edit Menu Item' : 'Add New Menu Item'}</CardTitle>
              <CardDescription>{isEditMode ? 'Update the details of your menu item' : 'Enter the basic details of your menu item'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Menu Item Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter menu item name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe your menu item"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Parent Category Selection - Only for Super Admin */}
              {user?.role === 'super-admin' && (
                <div>
                  <Label htmlFor="parentCategory">Parent Category *</Label>
                  <Select
                    onValueChange={(value) => {
                      setSelectedParentCategory(value);
                      setValue('parentCategory', value);
                      // Reset category and spicy level selection when parent changes
                      setValue('category', '');
                      setValue('spicyLevel', []);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category (Veg/Non-Veg)" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentCategories.map((parentCategory) => (
                        <SelectItem key={parentCategory._id} value={parentCategory._id}>
                          <div className="flex items-center gap-2">
                            {parentCategory.isVegetarian ? (
                              <span className="text-green-600">🌱</span>
                            ) : (
                              <span className="text-red-600">🍖</span>
                            )}
                            <span>{parentCategory.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedParentCategory && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Please select a parent category to see available menu categories
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="category">Menu Category *</Label>
                <Select
                  value={watchedCategory || ''}
                  onValueChange={(value) => setValue('category', value)}
                  disabled={user?.role === 'super-admin' && !selectedParentCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      user?.role === 'super-admin' && !selectedParentCategory
                        ? "Select parent category first"
                        : "Select a menu category"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{category.name}</span>
                            {category.parentCategory && user?.role !== 'super-admin' && (
                              <span className="text-muted-foreground text-xs ml-2">
                                ({category.parentCategory.isVegetarian ? 'Veg' : 'Non-Veg'})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-categories" disabled>
                        {user?.role === 'super-admin' && !selectedParentCategory
                          ? "Select parent category first"
                          : "No categories available"
                        }
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
              <CardDescription>Set pricing and stock information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mrp">MRP (₹) *</Label>
                  <Input
                    id="mrp"
                    type="number"
                    min="0"
                    step="0.01"
                    onWheel={(e) => e.currentTarget.blur()}
                    {...register('mrp', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.mrp && (
                    <p className="text-sm text-destructive mt-1">{errors.mrp.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="discountedPrice">Selling Price (₹) *</Label>
                  <Input
                    id="discountedPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    onWheel={(e) => e.currentTarget.blur()}
                    {...register('discountedPrice', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.discountedPrice && (
                    <p className="text-sm text-destructive mt-1">{errors.discountedPrice.message}</p>
                  )}
                </div>
              </div>

              {watchedMrp && watchedDiscountedPrice && watchedMrp > watchedDiscountedPrice && (
                <div className="text-sm text-green-600">
                  Discount: {Math.round(((watchedMrp - watchedDiscountedPrice) / watchedMrp) * 100)}%
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Stock Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="1"
                    onWheel={(e) => e.currentTarget.blur()}
                    {...register('quantity', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.quantity && (
                    <p className="text-sm text-destructive mt-1">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="preparationTime">Prep Time (minutes) *</Label>
                  <Input
                    id="preparationTime"
                    type="number"
                    min="1"
                    step="1"
                    onWheel={(e) => e.currentTarget.blur()}
                    {...register('preparationTime', { valueAsNumber: true })}
                    placeholder="15"
                  />
                  {errors.preparationTime && (
                    <p className="text-sm text-destructive mt-1">{errors.preparationTime.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Item Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sizes & Spice Level */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Item Details</CardTitle>
              <CardDescription>Configure sizes and spice level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Available Sizes</Label>
                <p className="text-sm text-muted-foreground mt-1">Select at least one size and set its price</p>
                <div className="space-y-3 mt-2">
                  {['Small', 'Medium', 'Large'].map((sizeName) => {
                    const currentSizes = watch('sizes') || [];
                    const existingSize = currentSizes.find(s => s.name === sizeName);
                    const isChecked = !!existingSize;

                    return (
                      <div key={sizeName} className="flex items-center space-x-4 p-3 border rounded">
                        <Checkbox
                          id={sizeName}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const currentSizes = watch('sizes') || [];
                            if (checked) {
                              const newSize = {
                                name: sizeName,
                                price: Number(watchedDiscountedPrice) || 0,
                                isDefault: sizeName === 'Medium' && currentSizes.length === 0
                              };
                              setValue('sizes', [...currentSizes, newSize]);
                              // Clear any previous size validation errors
                              clearErrors('sizes');
                            } else {
                              setValue('sizes', currentSizes.filter(s => s.name !== sizeName));
                            }
                          }}
                        />
                        <Label htmlFor={sizeName} className="flex-1">{sizeName}</Label>
                        {isChecked && (
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`${sizeName}-price`} className="text-sm">Price:</Label>
                            <Input
                              id={`${sizeName}-price`}
                              type="number"
                              min="0"
                              step="0.01"
                              onWheel={(e) => e.currentTarget.blur()}
                              value={existingSize?.price || 0}
                              onChange={(e) => {
                                const currentSizes = watch('sizes') || [];
                                const newPrice = Number(e.target.value) || 0;
                                const updatedSizes = currentSizes.map(s =>
                                  s.name === sizeName
                                    ? { ...s, price: newPrice }
                                    : s
                                );
                                setValue('sizes', updatedSizes);
                                // Clear validation errors when user updates price
                                if (newPrice >= 0) {
                                  clearErrors('sizes');
                                }
                              }}
                              className="w-20"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {errors.sizes && (
                  <p className="text-sm text-destructive mt-1">{errors.sizes.message}</p>
                )}
                {(!watch('sizes') || watch('sizes').length === 0) && (
                  <p className="text-sm text-amber-600 mt-1">⚠️ Please select at least one size to continue</p>
                )}
              </div>

              <InlineItemManager
                type="spicy"
                parentCategoryId={selectedParentCategory}
                selectedValue={watch('spicyLevel') || []}
                onValueChange={(value) => {
                  // Handle both single values and arrays
                  if (Array.isArray(value)) {
                    setValue('spicyLevel', value);
                  } else {
                    setValue('spicyLevel', [value]);
                  }
                }}
                label="Spicy Level"
                placeholder="Select spicy level"
                isMultiSelect={true}
              />

              <InlineItemManager
                type="preparation"
                parentCategoryId={selectedParentCategory}
                selectedValue={watch('preparation') || []}
                onValueChange={(value) => {
                  // Handle both single values and arrays
                  if (Array.isArray(value)) {
                    setValue('preparation', value);
                  } else {
                    setValue('preparation', [value]);
                  }
                }}
                label="Preparation Methods"
                placeholder="Select preparation methods"
                isMultiSelect={true}
              />

              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  {...register('specialInstructions')}
                  placeholder="Any special cooking instructions..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Item Images</CardTitle>
              <CardDescription>Upload up to 5 images (first image will be the main image)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="images">Upload Images *</Label>
                <div className="mt-2">
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('images')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Images ({selectedImages.length}/5)
                  </Button>
                </div>
                {customErrors.images && (
                  <p className="text-sm text-destructive mt-1">{customErrors.images}</p>
                )}
              </div>

              {imagePreviews.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop to reorder images. First image will be the main image.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className={`relative cursor-move transition-all duration-200 ${
                          draggedIndex === index ? 'opacity-50 scale-95' : ''
                        } ${
                          dragOverIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        {/* Drag handle */}
                        <div className="absolute top-1 left-1 z-10 bg-black/50 rounded p-1">
                          <GripVertical className="h-3 w-3 text-white" />
                        </div>

                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 z-10"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>

                        {index === 0 && (
                          <Badge className="absolute bottom-1 left-1 text-xs z-10">Main</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add-ons & Tags */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add-ons */}
          <Card>
            <CardHeader>
              <CardTitle>Add-ons</CardTitle>
              <CardDescription>Optional add-ons customers can purchase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add-on name"
                  value={newAddon.name}
                  onChange={(e) => setNewAddon(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Price"
                  value={newAddon.price || ''}
                  onChange={(e) => setNewAddon(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-24"
                />
                <Button className='mt-2' type="button" onClick={addAddon} size="sm">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {addons.length > 0 && (
                <div className="space-y-2">
                  {addons.map((addon, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span>{addon.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">₹{addon.price}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAddon(index)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Add tags to help customers find your menu item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button className='mt-2' type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/menu')}>
            Cancel
          </Button>
          <Button type="submit" disabled={menuLoading}>
            {menuLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {isEditMode ? 'Update Menu Item' : 'Create Menu Item'}
          </Button>
        </div>
      </form>
    </div>
  );
};
