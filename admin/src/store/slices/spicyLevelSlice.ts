import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface SpicyLevel {
  _id: string;
  name: string;
  description?: string;
  level: number;
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

export interface SpicyLevelState {
  spicyLevels: SpicyLevel[];
  currentSpicyLevel: SpicyLevel | null;
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
const initialState: SpicyLevelState = {
  spicyLevels: [],
  currentSpicyLevel: null,
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
export const fetchSpicyLevels = createAsyncThunk(
  'spicyLevel/fetchSpicyLevels',
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

    const response = await api.get(`/api/admin/spicy-levels?${queryParams.toString()}`);
    return response.data;
  }
);

export const fetchSpicyLevelsByCategory = createAsyncThunk(
  'spicyLevel/fetchSpicyLevelsByCategory',
  async (parentCategoryId: string) => {
    const response = await api.get(`/api/admin/spicy-levels/by-category/${parentCategoryId}`);
    return response.data;
  }
);

export const createSpicyLevel = createAsyncThunk(
  'spicyLevel/createSpicyLevel',
  async (spicyLevelData: {
    name: string;
    description?: string;
    level: number;
    parentCategory: string;
    sortOrder?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/spicy-levels', spicyLevelData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create spicy level');
    }
  }
);

export const updateSpicyLevel = createAsyncThunk(
  'spicyLevel/updateSpicyLevel',
  async ({ id, spicyLevelData }: { 
    id: string; 
    spicyLevelData: {
      name?: string;
      description?: string;
      level?: number;
      parentCategory?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/spicy-levels/${id}`, spicyLevelData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update spicy level');
    }
  }
);

export const deleteSpicyLevel = createAsyncThunk(
  'spicyLevel/deleteSpicyLevel',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/admin/spicy-levels/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete spicy level');
    }
  }
);

// Slice
const spicyLevelSlice = createSlice({
  name: 'spicyLevel',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSpicyLevel: (state) => {
      state.currentSpicyLevel = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch spicy levels
      .addCase(fetchSpicyLevels.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSpicyLevels.fulfilled, (state, action) => {
        state.isLoading = false;
        const responseData = action.payload.data || action.payload;
        state.spicyLevels = responseData.spicyLevels || [];
        state.pagination = responseData.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 50
        };
      })
      .addCase(fetchSpicyLevels.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch spicy levels';
      })
      
      // Fetch spicy levels by category
      .addCase(fetchSpicyLevelsByCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSpicyLevelsByCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        const responseData = action.payload.data || action.payload;
        state.spicyLevels = responseData.spicyLevels || [];
      })
      .addCase(fetchSpicyLevelsByCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch spicy levels';
      })
      
      // Create spicy level
      .addCase(createSpicyLevel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSpicyLevel.fulfilled, (state, action) => {
        state.isLoading = false;
        // Handle different response structures
        const spicyLevel = action.payload?.data?.spicyLevel || action.payload?.spicyLevel || action.payload;
        if (spicyLevel) {
          state.spicyLevels.unshift(spicyLevel);
        }
      })
      .addCase(createSpicyLevel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update spicy level
      .addCase(updateSpicyLevel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSpicyLevel.fulfilled, (state, action) => {
        state.isLoading = false;
        // Handle different response structures
        const spicyLevel = action.payload?.data?.spicyLevel || action.payload?.spicyLevel || action.payload;
        if (spicyLevel) {
          const index = state.spicyLevels.findIndex(item => item._id === spicyLevel._id);
          if (index !== -1) {
            state.spicyLevels[index] = spicyLevel;
          }
        }
      })
      .addCase(updateSpicyLevel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete spicy level
      .addCase(deleteSpicyLevel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSpicyLevel.fulfilled, (state, action) => {
        state.isLoading = false;
        state.spicyLevels = state.spicyLevels.filter(item => item._id !== action.payload);
      })
      .addCase(deleteSpicyLevel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentSpicyLevel } = spicyLevelSlice.actions;
export default spicyLevelSlice.reducer;
