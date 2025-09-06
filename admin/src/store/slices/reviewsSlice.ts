import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  menuItem: {
    _id: string;
    name: string;
    images: { url: string }[];
  };
  rating: number;
  comment: string;
  isApproved: boolean;
  moderatedBy?: string;
  moderatedAt?: string;
  moderatorNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsState {
  reviews: Review[];
  currentReview: Review | null;
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
    status: string;
    rating: string;
    menuItemId: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

// Initial state
const initialState: ReviewsState = {
  reviews: [],
  currentReview: null,
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
    status: '',
    rating: '',
    menuItemId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

// Async thunks
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/reviews?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch reviews');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

export const moderateReview = createAsyncThunk(
  'reviews/moderateReview',
  async ({ reviewId, action, moderatorNote }: { reviewId: string; action: string; moderatorNote?: string }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/reviews/${reviewId}/moderate`, { action, moderatorNote });
      
      if (response.success) {
        return response.data.review;
      } else {
        return rejectWithValue(response.message || 'Failed to moderate review');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to moderate review');
    }
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/admin/reviews/${reviewId}`);
      
      if (response.success) {
        return reviewId;
      } else {
        return rejectWithValue(response.message || 'Failed to delete review');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete review');
    }
  }
);

export const bulkModerateReviews = createAsyncThunk(
  'reviews/bulkModerateReviews',
  async ({ reviewIds, action, moderatorNote }: { reviewIds: string[]; action: string; moderatorNote?: string }, { rejectWithValue }) => {
    try {
      const response = await api.put('/api/admin/reviews/bulk-moderate', { reviewIds, action, moderatorNote });
      
      if (response.success) {
        return { reviewIds, action };
      } else {
        return rejectWithValue(response.message || 'Failed to moderate reviews');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to moderate reviews');
    }
  }
);

// Reviews slice
const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentReview: (state, action: PayloadAction<Review | null>) => {
      state.currentReview = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<ReviewsState['filters']>>) => {
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
    // Fetch Reviews
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reviews = action.payload.reviews;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Moderate Review
    builder
      .addCase(moderateReview.fulfilled, (state, action) => {
        const index = state.reviews.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.reviews[index] = action.payload;
        }
        if (state.currentReview?._id === action.payload._id) {
          state.currentReview = action.payload;
        }
      });

    // Delete Review
    builder
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.reviews = state.reviews.filter(r => r._id !== action.payload);
        if (state.currentReview?._id === action.payload) {
          state.currentReview = null;
        }
      });

    // Bulk Moderate Reviews
    builder
      .addCase(bulkModerateReviews.fulfilled, (state, action) => {
        const { reviewIds, action: moderateAction } = action.payload;
        state.reviews = state.reviews.map(review => {
          if (reviewIds.includes(review._id)) {
            return { ...review, isApproved: moderateAction === 'approve' };
          }
          return review;
        });
      });
  },
});

export const {
  clearError,
  setCurrentReview,
  updateFilters,
  resetFilters,
  setPagination,
} = reviewsSlice.actions;

export default reviewsSlice.reducer;
