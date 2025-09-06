import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { createMenuItem } from '@/store/slices/menuSlice';
import { fetchCategories, fetchParentCategories } from '@/store/slices/categoriesSlice';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Plus,
  Minus,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Form validation schema
const menuItemSchema = z.object({
  name: z.string().min(1, 'Menu item name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description cannot exceed 1000 characters'),
  parentCategory: z.string().optional(), // Only for super-admin
  category: z.string().min(1, 'Category is required'),
  mrp: z.number().min(0, 'MRP must be positive'),
  discountedPrice: z.number().min(0, 'Discounted price must be positive'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  sizes: z.array(z.string()).min(1, 'At least one size is required'),
  spicyLevel: z.string(),
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
  const dispatch = useAppDispatch();
  const { user, canManageVeg, canManageNonVeg } = useAuth();
  const { categories, parentCategories, isLoading: categoriesLoading } = useAppSelector((state) => state.categories);
  const { isLoading: menuLoading } = useAppSelector((state) => state.menu);

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [newAddon, setNewAddon] = useState<Addon>({ name: '', price: 0 });
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      sizes: ['Medium'],
      spicyLevel: 'Not Applicable',
      preparationTime: 15,
      tags: []
    }
  });

  const watchedMrp = watch('mrp');
  const watchedDiscountedPrice = watch('discountedPrice');

  useEffect(() => {
    // Fetch categories based on user role
    const params: any = { type: 'menu' };

    dispatch(fetchCategories(params));

    // Also fetch parent categories for super-admin
    if (user?.role === 'super-admin') {
      dispatch(fetchParentCategories());
    }
  }, [dispatch, user?.role]);

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
      toast.error('Maximum 5 images allowed');
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
    if (selectedImages.length === 0) {
      toast.error('At least one image is required');
      return;
    }

    if (data.discountedPrice > data.mrp) {
      toast.error('Discounted price cannot be greater than MRP');
      return;
    }

    const formData = new FormData();
    
    // Add basic fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'sizes' || key === 'tags') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value.toString());
      }
    });

    // Add role-based vegetarian status
    formData.append('isVegetarian', getIsVegetarian().toString());
    
    // Add addons
    formData.append('addons', JSON.stringify(addons));
    
    // Add images
    selectedImages.forEach((image, index) => {
      formData.append('images', image);
    });

    try {
      const result = await dispatch(createMenuItem(formData));
      if (createMenuItem.fulfilled.match(result)) {
        toast.success('Menu item created successfully!');
        navigate('/menu');
      } else {
        toast.error(result.payload as string || 'Failed to create menu item');
      }
    } catch (error) {
      toast.error('Failed to create menu item');
    }
  };

  const availableSizes = ['Small', 'Medium', 'Large'];
  const spicyLevels = ['Not Applicable', 'Mild', 'Medium', 'Hot', 'Extra Hot'];

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details of your menu item</CardDescription>
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
                      // Reset category selection when parent changes
                      setValue('category', '');
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
                <Label>Available Sizes *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableSizes.map((size) => (
                    <div key={size} className="flex items-center space-x-2">
                      <Checkbox
                        id={size}
                        checked={watch('sizes')?.includes(size)}
                        onCheckedChange={(checked) => {
                          const currentSizes = watch('sizes') || [];
                          if (checked) {
                            setValue('sizes', [...currentSizes, size]);
                          } else {
                            setValue('sizes', currentSizes.filter(s => s !== size));
                          }
                        }}
                      />
                      <Label htmlFor={size}>{size}</Label>
                    </div>
                  ))}
                </div>
                {errors.sizes && (
                  <p className="text-sm text-destructive mt-1">{errors.sizes.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="spicyLevel">Spice Level</Label>
                <Select onValueChange={(value) => setValue('spicyLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select spice level" />
                  </SelectTrigger>
                  <SelectContent>
                    {spicyLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <Badge className="absolute bottom-1 left-1 text-xs">Main</Badge>
                      )}
                    </div>
                  ))}
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
                  placeholder="Price"
                  value={newAddon.price || ''}
                  onChange={(e) => setNewAddon(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-24"
                />
                <Button type="button" onClick={addAddon} size="sm">
                  <Plus className="h-4 w-4" />
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
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="sm">
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
            Create Menu Item
          </Button>
        </div>
      </form>
    </div>
  );
};
