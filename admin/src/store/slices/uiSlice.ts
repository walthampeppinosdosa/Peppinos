import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
  modals: {
    [key: string]: boolean;
  };
  loading: {
    [key: string]: boolean;
  };
  selectedItems: {
    [key: string]: string[];
  };
  filters: {
    [key: string]: any;
  };
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

// Initial state
const initialState: UIState = {
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  modals: {},
  loading: {},
  selectedItems: {},
  filters: {},
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },

    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Modals
    openModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false;
    },
    toggleModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = !state.modals[action.payload];
    },

    // Loading states
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loading[action.payload];
    },

    // Selected items (for bulk operations)
    setSelectedItems: (state, action: PayloadAction<{ key: string; items: string[] }>) => {
      state.selectedItems[action.payload.key] = action.payload.items;
    },
    addSelectedItem: (state, action: PayloadAction<{ key: string; item: string }>) => {
      const { key, item } = action.payload;
      if (!state.selectedItems[key]) {
        state.selectedItems[key] = [];
      }
      if (!state.selectedItems[key].includes(item)) {
        state.selectedItems[key].push(item);
      }
    },
    removeSelectedItem: (state, action: PayloadAction<{ key: string; item: string }>) => {
      const { key, item } = action.payload;
      if (state.selectedItems[key]) {
        state.selectedItems[key] = state.selectedItems[key].filter(i => i !== item);
      }
    },
    clearSelectedItems: (state, action: PayloadAction<string>) => {
      state.selectedItems[action.payload] = [];
    },
    toggleSelectedItem: (state, action: PayloadAction<{ key: string; item: string }>) => {
      const { key, item } = action.payload;
      if (!state.selectedItems[key]) {
        state.selectedItems[key] = [];
      }
      const index = state.selectedItems[key].indexOf(item);
      if (index > -1) {
        state.selectedItems[key].splice(index, 1);
      } else {
        state.selectedItems[key].push(item);
      }
    },

    // Filters
    setFilter: (state, action: PayloadAction<{ key: string; filter: any }>) => {
      state.filters[action.payload.key] = action.payload.filter;
    },
    updateFilter: (state, action: PayloadAction<{ key: string; filter: any }>) => {
      if (!state.filters[action.payload.key]) {
        state.filters[action.payload.key] = {};
      }
      state.filters[action.payload.key] = {
        ...state.filters[action.payload.key],
        ...action.payload.filter,
      };
    },
    clearFilter: (state, action: PayloadAction<string>) => {
      delete state.filters[action.payload];
    },
    resetFilters: (state) => {
      state.filters = {};
    },
  },
});

export const {
  // Sidebar
  toggleSidebar,
  setSidebarOpen,

  // Theme
  setTheme,

  // Notifications
  addNotification,
  removeNotification,
  clearNotifications,

  // Modals
  openModal,
  closeModal,
  toggleModal,

  // Loading
  setLoading,
  clearLoading,

  // Selected items
  setSelectedItems,
  addSelectedItem,
  removeSelectedItem,
  clearSelectedItems,
  toggleSelectedItem,

  // Filters
  setFilter,
  updateFilter,
  clearFilter,
  resetFilters,
} = uiSlice.actions;

export default uiSlice.reducer;
