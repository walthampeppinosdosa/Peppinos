import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface Preparation {
  _id: string;
  name: string;
  description?: string;
  parentCategory: {
    _id: string;
    name: string;
    isVegetarian: boolean;
  };
  isActive: boolean;
  sortOrder: number;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PreparationState {
  preparations: Preparation[];
  currentPreparation: Preparation | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Initial state
const initialState: PreparationState = {
  preparations: [],
  currentPreparation: null,
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  },
};

// Async thunks
export const fetchPreparations = createAsyncThunk(
  'preparation/fetchPreparations',
  async (params: {
    parentCategory?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/admin/preparations?${queryParams.toString()}`);
    return response.data;
  }
);

export const fetchPreparationsByCategory = createAsyncThunk(
  'preparation/fetchPreparationsByCategory',
  async (parentCategoryId: string) => {
    const response = await api.get(`/api/admin/preparations/by-category/${parentCategoryId}`);
    return response.data;
  }
);

export const createPreparation = createAsyncThunk(
  'preparation/createPreparation',
  async (preparationData: {
    name: string;
    description?: string;
    parentCategory: string;
    sortOrder?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/preparations', preparationData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create preparation');
    }
  }
);

export const updatePreparation = createAsyncThunk(
  'preparation/updatePreparation',
  async ({ id, preparationData }: { 
    id: string; 
    preparationData: {
      name?: string;
      description?: string;
      parentCategory?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/preparations/${id}`, preparationData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update preparation');
    }
  }
);

export const deletePreparation = createAsyncThunk(
  'preparation/deletePreparation',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/admin/preparations/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete preparation');
    }
  }
);

// Slice
const preparationSlice = createSlice({
  name: 'preparation',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentPreparation: (state) => {
      state.currentPreparation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch preparations
      .addCase(fetchPreparations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPreparations.fulfilled, (state, action) => {
        state.isLoading = false;
        const responseData = action.payload.data || action.payload;
        state.preparations = responseData.preparations || [];
        state.pagination = responseData.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 50
        };
      })
      .addCase(fetchPreparations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch preparations';
      })
      
      // Fetch preparations by category
      .addCase(fetchPreparationsByCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPreparationsByCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        const responseData = action.payload.data || action.payload;
        state.preparations = responseData.preparations || [];
      })
      .addCase(fetchPreparationsByCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch preparations';
      })
      
      // Create preparation
      .addCase(createPreparation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPreparation.fulfilled, (state, action) => {
        state.isLoading = false;
        // Handle different response structures
        const preparation = action.payload?.data?.preparation || action.payload?.preparation || action.payload;
        if (preparation) {
          state.preparations.unshift(preparation);
        }
      })
      .addCase(createPreparation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update preparation
      .addCase(updatePreparation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePreparation.fulfilled, (state, action) => {
        state.isLoading = false;
        // Handle different response structures
        const preparation = action.payload?.data?.preparation || action.payload?.preparation || action.payload;
        if (preparation) {
          const index = state.preparations.findIndex(item => item._id === preparation._id);
          if (index !== -1) {
            state.preparations[index] = preparation;
          }
        }
      })
      .addCase(updatePreparation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete preparation
      .addCase(deletePreparation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePreparation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.preparations = state.preparations.filter(item => item._id !== action.payload);
      })
      .addCase(deletePreparation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentPreparation } = preparationSlice.actions;
export default preparationSlice.reducer;
