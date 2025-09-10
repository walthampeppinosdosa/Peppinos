import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  period?: string;
  category?: 'all' | 'veg' | 'non-veg';
  status?: string;
  search?: string;
}

export interface ReportData {
  _id: string;
  name: string;
  type: string;
  category?: string;
  isVegetarian?: boolean;
  status?: string;
  amount?: number;
  quantity?: number;
  date: string;
  user?: {
    name: string;
    email: string;
  };
  [key: string]: any;
}

export interface ReportAnalytics {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalMenuItems: number;
    totalCustomers: number;
    averageOrderValue: number;
    growthRate: number;
  };
  charts: {
    dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
    categoryPerformance: Array<{ category: string; revenue: number; orders: number }>;
    topMenuItems: Array<{ name: string; quantity: number; revenue: number }>;
    customerTrends: Array<{ date: string; newCustomers: number; returningCustomers: number }>;
  };
  vegNonVegBreakdown?: {
    veg: {
      revenue: number;
      orders: number;
      menuItems: number;
      percentage: number;
    };
    nonVeg: {
      revenue: number;
      orders: number;
      menuItems: number;
      percentage: number;
    };
  };
}

export interface ReportsState {
  // Data
  analytics: ReportAnalytics | null;
  reportData: ReportData[];
  recentReports: Array<{
    id: string;
    name: string;
    type: string;
    format: string;
    size: string;
    generatedAt: string;
    generatedBy: string;
  }>;
  
  // Filters and UI state
  filters: ReportFilters;
  selectedReportType: 'sales' | 'orders' | 'menu' | 'customers' | 'analytics';
  dateRange: {
    from: string | null;
    to: string | null;
  };
  
  // Loading states
  isLoading: boolean;
  isExporting: boolean;
  isGenerating: boolean;
  
  // Error handling
  error: string | null;
}

const initialState: ReportsState = {
  analytics: null,
  reportData: [],
  recentReports: [],
  filters: {
    period: '30d',
    category: 'all',
    search: ''
  },
  selectedReportType: 'analytics',
  dateRange: {
    from: null,
    to: null
  },
  isLoading: false,
  isExporting: false,
  isGenerating: false,
  error: null,
};

// Async thunks
export const fetchReportAnalytics = createAsyncThunk(
  'reports/fetchAnalytics',
  async (params: {
    filters?: ReportFilters;
    userRole?: string;
  }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const response = await api.get(`/api/admin/reports/analytics?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch report analytics');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch report analytics');
    }
  }
);

export const fetchReportData = createAsyncThunk(
  'reports/fetchData',
  async (params: {
    type: 'sales' | 'orders' | 'menu' | 'customers';
    filters?: ReportFilters;
  }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('type', params.type);
      
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const response = await api.get(`/api/admin/reports/data?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch report data');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch report data');
    }
  }
);

export const generateReport = createAsyncThunk(
  'reports/generate',
  async (params: {
    type: 'sales' | 'orders' | 'menu' | 'customers' | 'analytics';
    format: 'pdf' | 'excel' | 'csv';
    filters?: ReportFilters;
    title?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/reports/generate', params);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to generate report');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate report');
    }
  }
);

export const fetchRecentReports = createAsyncThunk(
  'reports/fetchRecent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/admin/reports/recent');
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch recent reports');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recent reports');
    }
  }
);

export const exportReportData = createAsyncThunk(
  'reports/export',
  async (params: {
    data: ReportData[];
    type: string;
    format: 'pdf' | 'excel' | 'csv';
    title?: string;
    filters?: ReportFilters;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/reports/export', params);
      
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

// Reports slice
const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<Partial<ReportFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSelectedReportType: (state, action: PayloadAction<'sales' | 'orders' | 'menu' | 'customers' | 'analytics'>) => {
      state.selectedReportType = action.payload;
    },
    setDateRange: (state, action: PayloadAction<{ from: string | null; to: string | null }>) => {
      state.dateRange = action.payload;
    },
    clearReportData: (state) => {
      state.reportData = [];
      state.analytics = null;
    },
    resetFilters: (state) => {
      state.filters = {
        period: '30d',
        category: 'all',
        search: ''
      };
      state.dateRange = {
        from: null,
        to: null
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch Report Analytics
    builder
      .addCase(fetchReportAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
        state.error = null;
      })
      .addCase(fetchReportAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Report Data
    builder
      .addCase(fetchReportData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reportData = Array.isArray(action.payload) ? action.payload : action.payload?.items || [];
        state.error = null;
      })
      .addCase(fetchReportData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Generate Report
    builder
      .addCase(generateReport.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.isGenerating = false;
        // Add to recent reports if provided
        if (action.payload.reportInfo) {
          state.recentReports.unshift(action.payload.reportInfo);
          // Keep only last 10 reports
          state.recentReports = state.recentReports.slice(0, 10);
        }
        state.error = null;
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      });

    // Fetch Recent Reports
    builder
      .addCase(fetchRecentReports.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchRecentReports.fulfilled, (state, action) => {
        state.recentReports = action.payload;
        state.error = null;
      })
      .addCase(fetchRecentReports.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Export Report Data
    builder
      .addCase(exportReportData.pending, (state) => {
        state.isExporting = true;
        state.error = null;
      })
      .addCase(exportReportData.fulfilled, (state) => {
        state.isExporting = false;
        state.error = null;
      })
      .addCase(exportReportData.rejected, (state, action) => {
        state.isExporting = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setFilters,
  setSelectedReportType,
  setDateRange,
  clearReportData,
  resetFilters,
} = reportsSlice.actions;

export default reportsSlice.reducer;
