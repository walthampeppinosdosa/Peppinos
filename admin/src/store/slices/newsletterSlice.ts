import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface Subscriber {
  _id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterState {
  subscribers: Subscriber[];
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
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  stats: {
    totalSubscribers: number;
    activeSubscribers: number;
    newSubscribers: number;
    unsubscribedCount: number;
    growthRate: number;
  } | null;
}

// Initial state
const initialState: NewsletterState = {
  subscribers: [],
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
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  stats: null,
};

// Async thunks
export const fetchSubscribers = createAsyncThunk(
  'newsletter/fetchSubscribers',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/newsletter/subscribers?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch subscribers');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscribers');
    }
  }
);

export const sendNewsletter = createAsyncThunk(
  'newsletter/sendNewsletter',
  async ({ subject, content, recipientType }: { subject: string; content: string; recipientType: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/newsletter/send', { subject, content, recipientType });
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to send newsletter');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send newsletter');
    }
  }
);

export const fetchNewsletterStats = createAsyncThunk(
  'newsletter/fetchStats',
  async (period: string = '30d', { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/newsletter/stats?period=${period}`);
      
      if (response.success) {
        return response.data.overview;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch newsletter stats');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch newsletter stats');
    }
  }
);

export const deleteSubscriber = createAsyncThunk(
  'newsletter/deleteSubscriber',
  async (subscriberId: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/admin/newsletter/subscribers/${subscriberId}`);
      
      if (response.success) {
        return subscriberId;
      } else {
        return rejectWithValue(response.message || 'Failed to delete subscriber');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete subscriber');
    }
  }
);

export const exportSubscribers = createAsyncThunk(
  'newsletter/exportSubscribers',
  async (params: { format?: 'csv' | 'json'; status?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/newsletter/export?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to export subscribers');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export subscribers');
    }
  }
);

// Newsletter slice
const newsletterSlice = createSlice({
  name: 'newsletter',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<NewsletterState['filters']>>) => {
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
    // Fetch Subscribers
    builder
      .addCase(fetchSubscribers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscribers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscribers = action.payload.subscribers;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchSubscribers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Send Newsletter
    builder
      .addCase(sendNewsletter.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendNewsletter.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(sendNewsletter.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Newsletter Stats
    builder
      .addCase(fetchNewsletterStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });

    // Delete Subscriber
    builder
      .addCase(deleteSubscriber.fulfilled, (state, action) => {
        state.subscribers = state.subscribers.filter(s => s._id !== action.payload);
      });

    // Export Subscribers
    builder
      .addCase(exportSubscribers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportSubscribers.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(exportSubscribers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  updateFilters,
  resetFilters,
  setPagination,
} = newsletterSlice.actions;

export default newsletterSlice.reducer;
