import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface ProductImage {
  url: string;
  publicId: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: {
    _id: string;
    name: string;
  };
  images: ProductImage[];
  mrp: number;
  discountedPrice: number;
  quantity: number;
  isVegetarian: boolean;
  spicyLevel: 'mild' | 'medium' | 'hot' | 'extra-hot';
  tags: string[];
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsState {
  products: Product[];
  currentProduct: Product | null;
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
const initialState: ProductsState = {
  products: [],
  currentProduct: null,
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 12,
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
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isVegetarian?: boolean;
    spicyLevel?: string;
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

      const response = await api.get(`/api/admin/products?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch products');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/products/${productId}`);
      
      if (response.success) {
        return response.data.product;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch product');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData: FormData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/products', productData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.success) {
        return response.data.product;
      } else {
        return rejectWithValue(response.message || 'Failed to create product');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ productId, productData }: { productId: string; productData: FormData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/products/${productId}`, productData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.success) {
        return response.data.product;
      } else {
        return rejectWithValue(response.message || 'Failed to update product');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/admin/products/${productId}`);
      
      if (response.success) {
        return productId;
      } else {
        return rejectWithValue(response.message || 'Failed to delete product');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

export const toggleProductStatus = createAsyncThunk(
  'products/toggleProductStatus',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/admin/products/${productId}/toggle-status`);
      
      if (response.success) {
        return response.data.product;
      } else {
        return rejectWithValue(response.message || 'Failed to toggle product status');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle product status');
    }
  }
);

// Products slice
const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProduct: (state, action: PayloadAction<Product | null>) => {
      state.currentProduct = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<ProductsState['filters']>>) => {
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
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Product by ID
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProduct = action.payload;
        state.error = null;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Product
    builder
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products.unshift(action.payload);
        state.error = null;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Product
    builder
      .addCase(updateProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.products.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
        if (state.currentProduct?._id === action.payload._id) {
          state.currentProduct = action.payload;
        }
        state.error = null;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Product
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = state.products.filter(p => p._id !== action.payload);
        if (state.currentProduct?._id === action.payload) {
          state.currentProduct = null;
        }
        state.error = null;
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Toggle Product Status
    builder
      .addCase(toggleProductStatus.fulfilled, (state, action) => {
        const index = state.products.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
        if (state.currentProduct?._id === action.payload._id) {
          state.currentProduct = action.payload;
        }
      });
  },
});

export const {
  clearError,
  setCurrentProduct,
  updateFilters,
  resetFilters,
  setPagination,
} = productsSlice.actions;

export default productsSlice.reducer;
