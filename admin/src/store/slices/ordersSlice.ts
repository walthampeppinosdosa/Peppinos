import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface OrderItem {
  _id: string;
  menu: {
    _id: string;
    name: string;
    images: Array<{
      public_id: string;
      url: string;
      width: number;
      height: number;
      _id: string;
    }>;
    discountedPrice: number;
  };
  menuName: string;
  menuImage: string;
  quantity: number;
  size: string;
  price: number;
  addons: Array<{
    name: string;
    price: number;
    _id: string;
  }>;
  specialInstructions: string;
  itemTotal: number;
}

export interface OrderUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'customer' | 'guest';
  sessionId?: string;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: OrderUser;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalPrice: number;
  orderType: 'delivery' | 'pickup';
  timing: 'asap' | 'scheduled';
  paymentMethod: string;
  estimatedDeliveryTime: string;
  specialInstructions: string;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
  customerType: 'guest' | 'registered';
  isGuestOrder: boolean;
}

export interface OrderStats {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number | null;
    pendingOrders: number;
    confirmedOrders: number;
    preparingOrders: number;
    readyOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    paidOrders: number;
    pendingPayments: number;
  };
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  topMenus: Array<{
    _id: string;
    totalQuantity: number;
    totalRevenue: number;
    menuName: string;
  }>;
}

export interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  stats: OrderStats | null;
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
    paymentStatus: string;
    deliveryStatus: string;
    startDate: string;
    endDate: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

// Initial state
const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  stats: null,
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
    paymentStatus: '',
    deliveryStatus: '',
    startDate: '',
    endDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    startDate?: string;
    endDate?: string;
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

      const response = await api.get(`/api/admin/orders?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch orders');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/orders/${orderId}`);
      
      if (response.success) {
        return response.data.order;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch order');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async (params: {
    orderId: string;
    paymentStatus?: string;
    deliveryStatus?: string;
  }, { rejectWithValue }) => {
    try {
      const { orderId, ...updateData } = params;
      const response = await api.put(`/api/admin/orders/${orderId}/status`, updateData);

      if (response.success) {
        return response.data.order;
      } else {
        return rejectWithValue(response.message || 'Failed to update order status');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order status');
    }
  }
);

export const fetchOrderStats = createAsyncThunk(
  'orders/fetchOrderStats',
  async (params: { startDate?: string; endDate?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/orders/stats?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch order stats');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order stats');
    }
  }
);

export const exportOrders = createAsyncThunk(
  'orders/exportOrders',
  async (params: {
    format?: 'csv' | 'json';
    startDate?: string;
    endDate?: string;
    status?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/orders/export?${queryParams.toString()}`);

      if (response.success || typeof response === 'string') {
        return response;
      } else {
        return rejectWithValue('Failed to export orders');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export orders');
    }
  }
);

// Orders slice
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<OrdersState['filters']>>) => {
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
    // Fetch Orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Order Status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.orders.findIndex(o => o._id === action.payload._id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.currentOrder?._id === action.payload._id) {
          state.currentOrder = action.payload;
        }
        state.error = null;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Order Stats
    builder
      .addCase(fetchOrderStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Export Orders
    builder
      .addCase(exportOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportOrders.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(exportOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentOrder,
  updateFilters,
  resetFilters,
  setPagination,
} = ordersSlice.actions;

export default ordersSlice.reducer;
