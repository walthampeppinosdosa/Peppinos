import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAlert } from '@/hooks/useAlert';
import {
  createSpicyLevel,
  updateSpicyLevel,
  deleteSpicyLevel,
  fetchSpicyLevelsByCategory
} from '@/store/slices/spicyLevelSlice';
import {
  createPreparation,
  updatePreparation,
  deletePreparation,
  fetchPreparationsByCategory
} from '@/store/slices/preparationSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Loader2, Edit2, Trash2, MoreVertical } from 'lucide-react';

interface InlineItemManagerProps {
  type: 'spicy' | 'preparation';
  parentCategoryId: string;
  selectedValue: string | string[];
  onValueChange: (value: string | string[]) => void;
  label: string;
  placeholder: string;
  isMultiSelect?: boolean;
}

export const InlineItemManager: React.FC<InlineItemManagerProps> = ({
  type,
  parentCategoryId,
  selectedValue,
  onValueChange,
  label,
  placeholder,
  isMultiSelect = false
}) => {
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  
  // Get the appropriate slice data based on type
  const sliceData = useAppSelector(state =>
    type === 'spicy' ? state.spicyLevels : state.preparations
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const allItems = type === 'spicy' ? sliceData.spicyLevels || [] : sliceData.preparations || [];
  const isLoading = sliceData.isLoading;

  // Filter items based on search term
  const items = allItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    level: 1 // Only used for spicy levels
  });

  const resetForm = () => {
    setNewItem({ name: '', description: '', level: 1 });
    setEditingItem(null);
  };

  const resetDeleteState = () => {
    setItemToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open && !isCreating) {
      resetForm();
    }
  };

  // Auto-refresh items when parent category changes
  useEffect(() => {
    if (parentCategoryId) {
      if (type === 'spicy') {
        dispatch(fetchSpicyLevelsByCategory(parentCategoryId));
      } else {
        dispatch(fetchPreparationsByCategory(parentCategoryId));
      }
    }
  }, [parentCategoryId, dispatch, type]);

  const handleSaveItem = async () => {
    if (!newItem.name.trim()) {
      showAlert(`Please enter a ${type} name`, 'error', 'Validation Error');
      return;
    }

    if (!parentCategoryId) {
      showAlert('Parent category is required', 'error', 'Validation Error');
      return;
    }

    setIsCreating(true);
    try {
      let result;
      
      if (type === 'spicy') {
        if (editingItem) {
          result = await dispatch(updateSpicyLevel({
            id: editingItem._id,
            spicyLevelData: {
              name: newItem.name.trim(),
              description: newItem.description.trim(),
              level: newItem.level
            }
          }));

          if (updateSpicyLevel.fulfilled.match(result)) {
            showAlert('Spicy level updated successfully', 'success', 'Success');
            resetForm();
            setIsDialogOpen(false);
          } else {
            showAlert(result.payload as string || 'Failed to update spicy level', 'error', 'Update Failed');
          }
        } else {
          result = await dispatch(createSpicyLevel({
            name: newItem.name.trim(),
            description: newItem.description.trim(),
            level: newItem.level,
            parentCategory: parentCategoryId,
            sortOrder: items.length
          }));

          if (createSpicyLevel.fulfilled.match(result)) {
            showAlert('Spicy level created successfully', 'success', 'Success');

            // Auto-select the newly created item - handle different response structures
            let newItemId;
            if (result.payload?.data?.spicyLevel?._id) {
              newItemId = result.payload.data.spicyLevel._id;
            } else if (result.payload?.spicyLevel?._id) {
              newItemId = result.payload.spicyLevel._id;
            } else if (result.payload?._id) {
              newItemId = result.payload._id;
            }

            if (newItemId) {
              onValueChange(newItemId);
            }

            resetForm();
            setIsDialogOpen(false);
          } else {
            showAlert(result.payload as string || 'Failed to create spicy level', 'error', 'Creation Failed');
          }
        }
      } else {
        if (editingItem) {
          result = await dispatch(updatePreparation({
            id: editingItem._id,
            preparationData: {
              name: newItem.name.trim(),
              description: newItem.description.trim()
            }
          }));

          if (updatePreparation.fulfilled.match(result)) {
            showAlert('Preparation method updated successfully', 'success', 'Success');
            resetForm();
            setIsDialogOpen(false);
          } else {
            showAlert(result.payload as string || 'Failed to update preparation', 'error', 'Update Failed');
          }
        } else {
          result = await dispatch(createPreparation({
            name: newItem.name.trim(),
            description: newItem.description.trim(),
            parentCategory: parentCategoryId,
            sortOrder: items.length
          }));

          if (createPreparation.fulfilled.match(result)) {
            showAlert('Preparation method created successfully', 'success', 'Success');

            // Auto-select the newly created item - handle different response structures
            let newItemId;
            if (result.payload?.data?.preparation?._id) {
              newItemId = result.payload.data.preparation._id;
            } else if (result.payload?.preparation?._id) {
              newItemId = result.payload.preparation._id;
            } else if (result.payload?._id) {
              newItemId = result.payload._id;
            }

            if (newItemId) {
              const currentSelected = Array.isArray(selectedValue) ? selectedValue : [];
              onValueChange([...currentSelected, newItemId]);
            }

            resetForm();
            setIsDialogOpen(false);
          } else {
            showAlert(result.payload as string || 'Failed to create preparation', 'error', 'Creation Failed');
          }
        }
      }
    } catch (error) {
      console.error(`Error saving ${type}:`, error);
      showAlert(`Failed to save ${type}`, 'error', 'Save Failed');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      description: item.description || '',
      level: item.level || 1
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      let result;

      if (type === 'spicy') {
        result = await dispatch(deleteSpicyLevel(itemToDelete._id));

        if (deleteSpicyLevel.fulfilled.match(result)) {
          showAlert('Spicy level deleted successfully', 'success', 'Success');

          // Clear selection if the deleted item was selected
          if (selectedValue === itemToDelete._id) {
            onValueChange('');
          }
        } else {
          showAlert('Failed to delete spicy level', 'error', 'Delete Failed');
        }
      } else {
        result = await dispatch(deletePreparation(itemToDelete._id));

        if (deletePreparation.fulfilled.match(result)) {
          showAlert('Preparation method deleted successfully', 'success', 'Success');

          // Remove from selected preparations if it was selected
          const currentSelected = Array.isArray(selectedValue) ? selectedValue : [];
          onValueChange(currentSelected.filter(id => id !== itemToDelete._id));
        } else {
          showAlert('Failed to delete preparation method', 'error', 'Delete Failed');
        }
      }

      resetDeleteState();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      showAlert(`Failed to delete ${type}`, 'error', 'Delete Failed');
      resetDeleteState();
    }
  };

  const handleValueToggle = (itemId: string, checked: boolean) => {
    if (!isMultiSelect) return;

    const currentSelected = Array.isArray(selectedValue) ? selectedValue : [];

    if (itemId === 'not-applicable') {
      if (checked) {
        // If "Not Applicable" is selected, clear all other selections
        onValueChange(['not-applicable']);
      } else {
        // If "Not Applicable" is deselected, just remove it
        onValueChange(currentSelected.filter(id => id !== itemId));
      }
    } else {
      if (checked) {
        // If any other item is selected, remove "Not Applicable" and add the new item
        const newSelected = currentSelected.filter(id => id !== 'not-applicable');
        onValueChange([...newSelected, itemId]);
      } else {
        // If any other item is deselected, just remove it
        onValueChange(currentSelected.filter(id => id !== itemId));
      }
    }
  };

  return (
    <div>
      {/* Header with Label and Add Button */}
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">{label}</Label>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!parentCategoryId || isLoading}
              title={`Add new ${type}`}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? `Edit ${label}` : `Add New ${label}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="itemName">Name *</Label>
                <Input
                  id="itemName"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={`e.g., ${type === 'spicy' ? 'Extra Hot' : 'Gluten Free'}`}
                  maxLength={30}
                />
              </div>

              <div>
                <Label htmlFor="itemDescription">Description</Label>
                <Textarea
                  id="itemDescription"
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  maxLength={100}
                  rows={2}
                />
              </div>

              {type === 'spicy' && (
                <div>
                  <Label htmlFor="spicyLevel">Spicy Level (1-10)</Label>
                  <Input
                    id="spicyLevel"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    onWheel={(e) => e.currentTarget.blur()}
                    value={newItem.level}
                    onChange={(e) => setNewItem(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={isCreating || !newItem.name.trim()}
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Input */}
      {parentCategoryId && allItems.length > 0 && (
        <div className="mb-2">
          <Input
            placeholder={`Search ${type === 'spicy' ? 'spicy levels' : 'preparation methods'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
        </div>
      )}

      {/* Unified Dropdown with Items */}
      <div className="border rounded-md">
        {!parentCategoryId ? (
          <div className="p-3 text-sm text-muted-foreground text-center">
            Select parent category first
          </div>
        ) : allItems.length === 0 ? (
          <div className="max-h-48 overflow-y-auto">
            {isMultiSelect ? (
              // Show "Not Applicable" option even when no items exist
              <div className="flex items-center justify-between p-3 border-b hover:bg-muted/50">
                <div className="flex items-center space-x-3 flex-1">
                  <input
                    type="checkbox"
                    id="not-applicable-multi-empty"
                    checked={Array.isArray(selectedValue) && selectedValue.includes('not-applicable')}
                    onChange={(e) => handleValueToggle('not-applicable', e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="not-applicable-multi-empty" className="text-sm font-medium cursor-pointer">
                    Not Applicable
                  </Label>
                </div>
              </div>
            ) : (
              // Single select mode
              <div className="flex items-center justify-between p-3 border-b hover:bg-muted/50">
                <div className="flex items-center space-x-3 flex-1">
                  <input
                    type="radio"
                    id="not-applicable-empty"
                    name={`${type}-selection`}
                    checked={selectedValue === 'not-applicable'}
                    onChange={() => onValueChange('not-applicable')}
                    className="border-input"
                  />
                  <Label htmlFor="not-applicable-empty" className="text-sm font-medium cursor-pointer">
                    Not Applicable
                  </Label>
                </div>
              </div>
            )}
            <div className="p-3 text-sm text-muted-foreground text-center border-t">
              No {type} items available. Click "Add" to create the first one.
            </div>
          </div>
        ) : items.length === 0 && searchTerm ? (
          <div className="p-3 text-sm text-muted-foreground text-center">
            No {type} items match your search. Try a different term.
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {isMultiSelect ? (
              // Multi-select for preparations and spicy levels
              <>
                <div className="flex items-center justify-between p-3 border-b hover:bg-muted/50">
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      id="not-applicable-multi"
                      checked={Array.isArray(selectedValue) && selectedValue.includes('not-applicable')}
                      onChange={(e) => handleValueToggle('not-applicable', e.target.checked)}
                      className="rounded border-input"
                    />
                    <Label htmlFor="not-applicable-multi" className="text-sm font-medium cursor-pointer">
                      Not Applicable
                    </Label>
                  </div>
                </div>
                {items.map((item: any) => (
                <div key={item._id} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50">
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      id={`item-${item._id}`}
                      checked={Array.isArray(selectedValue) && selectedValue.includes(item._id)}
                      onChange={(e) => handleValueToggle(item._id, e.target.checked)}
                      className="rounded border-input"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`item-${item._id}`} className="text-sm font-medium cursor-pointer">
                        {item.name}
                      </Label>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className="h-7 w-7 p-0"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(item)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              </>
            ) : (
              // Single select for spicy levels
              <>
                <div className="flex items-center justify-between p-3 border-b hover:bg-muted/50">
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="radio"
                      id="not-applicable"
                      name={`${type}-selection`}
                      checked={selectedValue === 'not-applicable'}
                      onChange={() => onValueChange('not-applicable')}
                      className="border-input"
                    />
                    <Label htmlFor="not-applicable" className="text-sm font-medium cursor-pointer">
                      Not Applicable
                    </Label>
                  </div>
                </div>
                {items.map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50">
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="radio"
                        id={`item-${item._id}`}
                        name={`${type}-selection`}
                        checked={selectedValue === item._id}
                        onChange={() => onValueChange(item._id)}
                        className="border-input"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`item-${item._id}`} className="text-sm font-medium cursor-pointer">
                          {item.name}
                          {type === 'spicy' && (
                            <span className="text-xs text-muted-foreground ml-2">(Level {item.level})</span>
                          )}
                        </Label>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                        className="h-7 w-7 p-0"
                        title="Edit"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(item)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
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
