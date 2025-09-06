import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Types
export interface Contact {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  adminNotes?: string;
  replyMessage?: string;
  repliedAt?: string;
  repliedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  _id: string;
  name: string;
  email: string;
  type: 'general' | 'complaint' | 'suggestion' | 'compliment';
  rating: number;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsState {
  contacts: Contact[];
  feedback: Feedback[];
  currentContact: Contact | null;
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
    priority: string;
    type: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  stats: {
    totalContacts: number;
    pendingContacts: number;
    resolvedContacts: number;
    newContacts: number;
    totalFeedback: number;
    averageFeedbackRating: number;
  } | null;
}

// Initial state
const initialState: ContactsState = {
  contacts: [],
  feedback: [],
  currentContact: null,
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
    priority: '',
    type: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  stats: null,
};

// Async thunks
export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/contacts?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch contacts');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch contacts');
    }
  }
);

export const fetchContactById = createAsyncThunk(
  'contacts/fetchContactById',
  async (contactId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/contacts/${contactId}`);
      
      if (response.success) {
        return response.data.contact;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch contact');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch contact');
    }
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ contactId, data }: { contactId: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/contacts/${contactId}`, data);
      
      if (response.success) {
        return response.data.contact;
      } else {
        return rejectWithValue(response.message || 'Failed to update contact');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update contact');
    }
  }
);

export const replyToContact = createAsyncThunk(
  'contacts/replyToContact',
  async ({ contactId, replyMessage }: { contactId: string; replyMessage: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/admin/contacts/${contactId}/reply`, { replyMessage });
      
      if (response.success) {
        return response.data.contact;
      } else {
        return rejectWithValue(response.message || 'Failed to send reply');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send reply');
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (contactId: string, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/admin/contacts/${contactId}`);
      
      if (response.success) {
        return contactId;
      } else {
        return rejectWithValue(response.message || 'Failed to delete contact');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete contact');
    }
  }
);

export const fetchFeedback = createAsyncThunk(
  'contacts/fetchFeedback',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/api/admin/feedback?${queryParams.toString()}`);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch feedback');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch feedback');
    }
  }
);

export const fetchContactStats = createAsyncThunk(
  'contacts/fetchStats',
  async (period: string = '30d', { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/contacts/stats?period=${period}`);
      
      if (response.success) {
        return response.data.overview;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch contact stats');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch contact stats');
    }
  }
);

// Contacts slice
const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentContact: (state, action: PayloadAction<Contact | null>) => {
      state.currentContact = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<ContactsState['filters']>>) => {
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
    // Fetch Contacts
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contacts = action.payload.contacts;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Contact by ID
    builder
      .addCase(fetchContactById.fulfilled, (state, action) => {
        state.currentContact = action.payload;
      });

    // Update Contact
    builder
      .addCase(updateContact.fulfilled, (state, action) => {
        const index = state.contacts.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.contacts[index] = action.payload;
        }
        if (state.currentContact?._id === action.payload._id) {
          state.currentContact = action.payload;
        }
      });

    // Reply to Contact
    builder
      .addCase(replyToContact.fulfilled, (state, action) => {
        const index = state.contacts.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.contacts[index] = action.payload;
        }
        if (state.currentContact?._id === action.payload._id) {
          state.currentContact = action.payload;
        }
      });

    // Delete Contact
    builder
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.contacts = state.contacts.filter(c => c._id !== action.payload);
        if (state.currentContact?._id === action.payload) {
          state.currentContact = null;
        }
      });

    // Fetch Feedback
    builder
      .addCase(fetchFeedback.fulfilled, (state, action) => {
        state.feedback = action.payload.feedback;
      });

    // Fetch Contact Stats
    builder
      .addCase(fetchContactStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentContact,
  updateFilters,
  resetFilters,
  setPagination,
} = contactsSlice.actions;

export default contactsSlice.reducer;
