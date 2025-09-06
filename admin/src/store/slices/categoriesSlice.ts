import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface Category {
  _id: string;
  name: string;
  description: string;
  image?: {
    url: string;
    publicId: string;
  };
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesState {
  categories: Category[];
  currentCategory: Category | null;
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
    isActive: boolean | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

// Initial state
const initialState: CategoriesState = {
  categories: [],
  currentCategory: null,
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10,
  },
  filters: {
    search: '',
    isActive: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/categories?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch categories');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  'categories/fetchCategoryById',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/categories/${categoryId}`);
      
      if (response.success) {
        return response.data.category;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch category');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch category');
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: FormData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/categories', categoryData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.success) {
        return response.data.category;
      } else {
        return rejectWithValue(response.message || 'Failed to create category');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create category');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ categoryId, categoryData }: { categoryId: string; categoryData: FormData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/categories/${categoryId}`, categoryData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.success) {
        return response.data.category;
      } else {
        return rejectWithValue(response.message || 'Failed to update category');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/admin/categories/${categoryId}`);
      
      if (response.success) {
        return categoryId;
      } else {
        return rejectWithValue(response.message || 'Failed to delete category');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete category');
    }
  }
);

export const toggleCategoryStatus = createAsyncThunk(
  'categories/toggleCategoryStatus',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/admin/categories/${categoryId}/toggle-status`);
      
      if (response.success) {
        return response.data.category;
      } else {
        return rejectWithValue(response.message || 'Failed to toggle category status');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle category status');
    }
  }
);

// Categories slice
const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCategory: (state, action: PayloadAction<Category | null>) => {
      state.currentCategory = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<CategoriesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    setPagination: (state, action: PayloadAction<{ page: number }>) => {
      state.pagination.currentPage = action.payload.page;
    },
  },
  extraReducers: (builder) => {
    // Fetch Categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload.categories;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Category by ID
    builder
      .addCase(fetchCategoryById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCategory = action.payload;
        state.error = null;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Category
    builder
      .addCase(createCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories.unshift(action.payload);
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Category
    builder
      .addCase(updateCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.categories.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.currentCategory?._id === action.payload._id) {
          state.currentCategory = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Category
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = state.categories.filter(c => c._id !== action.payload);
        if (state.currentCategory?._id === action.payload) {
          state.currentCategory = null;
        }
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Toggle Category Status
    builder
      .addCase(toggleCategoryStatus.fulfilled, (state, action) => {
        const index = state.categories.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.currentCategory?._id === action.payload._id) {
          state.currentCategory = action.payload;
        }
      });
  },
});

export const {
  clearError,
  setCurrentCategory,
  updateFilters,
  resetFilters,
  setPagination,
} = categoriesSlice.actions;

export default categoriesSlice.reducer;
