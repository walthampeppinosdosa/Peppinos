import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface MenuItemImage {
  url: string;
  publicId: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  category: {
    _id: string;
    name: string;
    slug?: string;
    isVegetarian?: boolean;
    parentCategory?: {
      _id: string;
      name: string;
      isVegetarian: boolean;
    };
  };
  images: MenuItemImage[];
  mrp: number;
  discountedPrice: number;
  quantity: number;
  sizes?: Array<{
    name: string;
    price: number;
    isDefault: boolean;
  }>;
  isVegetarian: boolean;
  spicyLevel?: Array<{
    _id: string;
    name: string;
    level: number;
  }> | string[];
  preparations?: string[];
  preparationTime?: number;
  specialInstructions?: string;
  addons?: Array<{
    name: string;
    price: number;
  }>;
  tags: string[];
  isActive: boolean;
  isAvailable?: boolean;
  averageRating: number;
  totalReviews: number;
  totalSales?: number;
  featured?: boolean;
  sortOrder?: number;
  discountPercentage?: number;
  availabilityStatus?: string;
  createdAt: string;
  updatedAt: string;
  id?: string;
}

export interface MenuState {
  menuItems: MenuItem[];
  currentMenuItem: MenuItem | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: {
    search: string;
    category: string;
    isVegetarian: boolean | null;
    spicyLevel: string;
    isActive: boolean | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

// Initial state
const initialState: MenuState = {
  menuItems: [],
  currentMenuItem: null,
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  },
  filters: {
    search: '',
    category: '',
    isVegetarian: null,
    spicyLevel: '',
    isActive: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

// Async thunks
export const fetchMenuItems = createAsyncThunk(
  'menu/fetchMenuItems',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isVegetarian?: boolean | string;
    isActive?: boolean | string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/admin/menu?${queryParams.toString()}`);
    return response.data;
  }
);

export const fetchMenuItemById = createAsyncThunk(
  'menu/fetchMenuItemById',
  async (id: string) => {
    const response = await api.get(`/api/admin/menu/${id}`);
    return response.data;
  }
);

export const createMenuItem = createAsyncThunk(
  'menu/createMenuItem',
  async (menuItemData: FormData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/menu', menuItemData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create menu item');
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'menu/updateMenuItem',
  async ({ id, menuItemData }: { id: string; menuItemData: FormData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/menu/${id}`, menuItemData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // The api.put already extracts res.data, so response is { success, message, data }
      // We need to return response.data to get the actual menu item
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update menu item');
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  'menu/deleteMenuItem',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/admin/menu/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete menu item');
    }
  }
);

// Slice
const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<MenuState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentMenuItem: (state) => {
      state.currentMenuItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch menu items
      .addCase(fetchMenuItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.isLoading = false;
        // Handle both direct response and nested data response
        const responseData = action.payload.data || action.payload;
        const menuItems = responseData.menuItems || [];

        // Filter out any invalid menu items and log warnings
        const validMenuItems = menuItems.filter((item: any) => {
          if (!item || typeof item !== 'object') {
            console.warn('Invalid menu item found (not an object):', item);
            return false;
          }
          if (!item._id) {
            console.warn('Menu item missing _id:', item);
            return false;
          }
          if (typeof item.isVegetarian !== 'boolean') {
            console.warn('Menu item missing or invalid isVegetarian property:', item);
            return false;
          }
          return true;
        });

        state.menuItems = validMenuItems;
        state.pagination = responseData.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10
        };

        if (validMenuItems.length !== menuItems.length) {
          console.warn(`Filtered out ${menuItems.length - validMenuItems.length} invalid menu items`);
        }
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch menu items';
      })
      
      // Fetch menu item by ID
      .addCase(fetchMenuItemById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMenuItemById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMenuItem = action.payload._id ? action.payload : action.payload.data;
      })
      .addCase(fetchMenuItemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch menu item';
      })
      
      // Create menu item
      .addCase(createMenuItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMenuItem.fulfilled, (state, action) => {
        state.isLoading = false;
        // Don't add to state directly - let the component trigger a re-fetch
        // This ensures data consistency and proper population
      })
      .addCase(createMenuItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update menu item
      .addCase(updateMenuItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMenuItem.fulfilled, (state, action) => {
        state.isLoading = false;

        // The thunk returns response.data which is the menu item
        const updatedItem = action.payload;

        if (updatedItem && updatedItem._id) {
          const index = state.menuItems.findIndex(item => item._id === updatedItem._id);
          if (index !== -1) {
            state.menuItems[index] = updatedItem;
          }
          if (state.currentMenuItem?._id === updatedItem._id) {
            state.currentMenuItem = updatedItem;
          }
        }
      })
      .addCase(updateMenuItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete menu item
      .addCase(deleteMenuItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMenuItem.fulfilled, (state, action) => {
        state.isLoading = false;
        state.menuItems = state.menuItems.filter(item => item._id !== action.payload);
        if (state.currentMenuItem?._id === action.payload) {
          state.currentMenuItem = null;
        }
      })
      .addCase(deleteMenuItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearError, clearCurrentMenuItem } = menuSlice.actions;
export default menuSlice.reducer;
