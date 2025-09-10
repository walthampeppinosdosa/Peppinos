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
  async (params: {
    period?: string;
    category?: 'veg' | 'non-veg';
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const { period = '30d', category, startDate, endDate } = params;
      const queryParams = new URLSearchParams();

      queryParams.append('period', period);
      if (category) queryParams.append('category', category);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await api.get(`/api/admin/dashboard/analytics?${queryParams.toString()}`);

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
  async (params: {
    period?: string;
    category?: 'veg' | 'non-veg';
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const { period = '30d', category, startDate, endDate } = params;
      const queryParams = new URLSearchParams();

      queryParams.append('period', period);
      if (category) queryParams.append('category', category);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await api.get(`/api/admin/dashboard/cart-analytics?${queryParams.toString()}`);

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

export const exportDashboardReport = createAsyncThunk(
  'dashboard/exportReport',
  async (params: {
    type: 'orders' | 'menu' | 'users';
    format?: 'csv' | 'json' | 'pdf' | 'excel';
    startDate?: string;
    endDate?: string;
    period?: string;
    category?: 'veg' | 'non-veg';
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

    // Export Dashboard Report
    builder
      .addCase(exportDashboardReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportDashboardReport.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(exportDashboardReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setSelectedPeriod } = dashboardSlice.actions;
export default dashboardSlice.reducer;
