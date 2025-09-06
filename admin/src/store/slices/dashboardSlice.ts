import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface DashboardStats {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalUsers: number;
    totalMenuItems: number;
    pendingOrders: number;
    completedOrders: number;
    activeUsers: number;
    averageOrderValue: number;
  };
  charts: {
    dailyRevenue: Array<{ _id: string; revenue: number; orderCount: number }>;
    userRegistrationTrend: Array<{ _id: string; count: number }>;
    orderStatusDistribution: Array<{ _id: string; count: number }>;
    categoryPerformance: Array<{ _id: string; categoryName: string; totalQuantity: number; totalRevenue: number }>;
  };
  topMenuItems: Array<{
    _id: string;
    menuItemName: string;
    menuItemImage: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  period: string;
}

export interface CartAnalytics {
  overview: {
    totalCarts: number;
    activeCarts: number;
    abandonedCarts: number;
    averageCartValue: number;
    conversionRate: number;
  };
  mostAddedMenuItems: Array<{
    _id: string;
    menuItemName: string;
    menuItemImage: string;
    addedCount: number;
    totalQuantity: number;
  }>;
  abandonmentByHour: Array<{ _id: number; count: number }>;
  period: string;
}

export interface DashboardState {
  stats: DashboardStats | null;
  cartAnalytics: CartAnalytics | null;
  isLoading: boolean;
  error: string | null;
  selectedPeriod: string;
}

// Initial state
const initialState: DashboardState = {
  stats: null,
  cartAnalytics: null,
  isLoading: false,
  error: null,
  selectedPeriod: '30d',
};

// Async thunks
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (period: string = '30d', { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/dashboard/analytics?period=${period}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch dashboard stats');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }
);

export const fetchCartAnalytics = createAsyncThunk(
  'dashboard/fetchCartAnalytics',
  async (period: string = '30d', { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/dashboard/cart-analytics?period=${period}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch cart analytics');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart analytics');
    }
  }
);

export const exportReport = createAsyncThunk(
  'dashboard/exportReport',
  async (params: {
    type: 'orders' | 'menu' | 'users';
    format?: 'csv' | 'json';
    startDate?: string;
    endDate?: string;
    period?: string;
  }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/dashboard/export?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to export report');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export report');
    }
  }
);

// Dashboard slice
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedPeriod: (state, action) => {
      state.selectedPeriod = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Dashboard Stats
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Cart Analytics
    builder
      .addCase(fetchCartAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCartAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cartAnalytics = action.payload;
        state.error = null;
      })
      .addCase(fetchCartAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Export Report
    builder
      .addCase(exportReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setSelectedPeriod } = dashboardSlice.actions;
export default dashboardSlice.reducer;
