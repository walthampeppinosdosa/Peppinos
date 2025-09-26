import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMenuItemById, clearCurrentMenuItem } from '@/store/slices/menuSlice';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Loader2, 
  Clock, 
  DollarSign, 
  Package, 
  Star,
  Leaf,
  Utensils,
  Tag,
  Image as ImageIcon
} from 'lucide-react';

export const ViewMenuItem: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  
  const { currentMenuItem, isLoading, error } = useAppSelector((state) => state.menu);

  useEffect(() => {
    if (id) {
      // Only fetch if we don't already have the correct menu item
      if (!currentMenuItem || currentMenuItem._id !== id) {
        dispatch(fetchMenuItemById(id));
      }
    }

    // Don't clear on unmount to prevent flickering
    // return () => {
    //   dispatch(clearCurrentMenuItem());
    // };
  }, [dispatch, id, currentMenuItem]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-center mt-4">Loading menu item...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading menu item: {error}</p>
        <Button onClick={() => navigate('/menu')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Menu
        </Button>
      </div>
    );
  }

  if (!currentMenuItem) {
    return (
      <div className="text-center py-8">
        <p>Menu item not found</p>
        <p className="text-sm text-muted-foreground mt-2">
          ID: {id} | Loading: {isLoading.toString()} | Error: {error || 'None'}
        </p>
        <Button onClick={() => navigate('/menu')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Menu
        </Button>
      </div>
    );
  }

  const canEdit = () => {
    if (user?.role === 'super-admin') return true;
    if (user?.role === 'veg-admin' && currentMenuItem.isVegetarian) return true;
    if (user?.role === 'non-veg-admin' && !currentMenuItem.isVegetarian) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/menu')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {currentMenuItem.isVegetarian ? (
                <Leaf className="h-6 w-6 text-green-600" />
              ) : (
                <Utensils className="h-6 w-6 text-red-600" />
              )}
              {currentMenuItem.name}
            </h1>
            <p className="text-muted-foreground">Menu item details</p>
          </div>
        </div>
        
        {canEdit() && (
          <Button onClick={() => navigate(`/menu/edit/${currentMenuItem._id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{currentMenuItem.description}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Category</h4>
                  <Badge variant="secondary">{currentMenuItem.category.name}</Badge>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Type</h4>
                  <Badge variant={currentMenuItem.isVegetarian ? "default" : "destructive"}>
                    {currentMenuItem.isVegetarian ? "Vegetarian" : "Non-Vegetarian"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Status</h4>
                  <Badge variant={currentMenuItem.isActive ? "default" : "secondary"}>
                    {currentMenuItem.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Signature Dish</h4>
                  <Badge variant={currentMenuItem.isSignatureDish === true ? "default" : "outline"}
                         className={currentMenuItem.isSignatureDish === true ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : ""}>
                    {currentMenuItem.isSignatureDish === true ? "Yes" : "No"}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Spice Level</h4>
                  <div className="flex flex-wrap gap-1">
                    {currentMenuItem.spicyLevel && Array.isArray(currentMenuItem.spicyLevel) && currentMenuItem.spicyLevel.length > 0 ? (
                      currentMenuItem.spicyLevel.map((level: any, index: number) => (
                        <Badge key={index} variant="outline">
                          {typeof level === 'object' && level?.name ? level.name :
                           typeof level === 'string' ? level :
                           'Unknown'}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">Not specified</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Preparation Methods</h4>
                  <div className="flex flex-wrap gap-1">
                    {currentMenuItem.preparations && Array.isArray(currentMenuItem.preparations) && currentMenuItem.preparations.length > 0 ? (
                      currentMenuItem.preparations.map((prep: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {typeof prep === 'object' && prep?.name ? prep.name :
                           typeof prep === 'string' ? prep :
                           'Unknown'}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">Not specified</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          {currentMenuItem.images && currentMenuItem.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {currentMenuItem.images.map((image, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={image.url}
                        alt={`${currentMenuItem.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add-ons */}
          {currentMenuItem.addons && currentMenuItem.addons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Add-ons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentMenuItem.addons.map((addon, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <span>{addon.name}</span>
                      <Badge variant="outline">₹{addon.price}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {currentMenuItem.tags && currentMenuItem.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {currentMenuItem.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing & Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">MRP</h4>
                <p className="text-2xl font-bold">₹{currentMenuItem.mrp}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Discounted Price</h4>
                <p className="text-2xl font-bold text-green-600">₹{currentMenuItem.discountedPrice}</p>
                {currentMenuItem.mrp > currentMenuItem.discountedPrice && (
                  <p className="text-sm text-muted-foreground">
                    {Math.round(((currentMenuItem.mrp - currentMenuItem.discountedPrice) / currentMenuItem.mrp) * 100)}% off
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-1 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Stock Quantity
                </h4>
                <p className="text-lg font-semibold">{currentMenuItem.quantity} units</p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preparation Time
                </h4>
                <p>{currentMenuItem.preparationTime || 15} minutes</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Available Sizes</h4>
                <div className="flex flex-wrap gap-1">
                  {currentMenuItem.sizes?.map((size, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {size.name} - ${size.price}
                      {size.isDefault && ' (Default)'}
                    </Badge>
                  ))}
                </div>
              </div>

              {currentMenuItem.specialInstructions && (
                <div>
                  <h4 className="font-medium mb-1">Special Instructions</h4>
                  <p className="text-sm text-muted-foreground">{currentMenuItem.specialInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold flex items-center justify-center gap-2">
                  {currentMenuItem.averageRating || 0}
                  <Star className="h-6 w-6 text-yellow-500 fill-current" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentMenuItem.totalReviews || 0} reviews
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Created:</span>
                <p className="text-muted-foreground">
                  {new Date(currentMenuItem.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>
                <p className="text-muted-foreground">
                  {new Date(currentMenuItem.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
