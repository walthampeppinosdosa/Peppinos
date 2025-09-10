import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import all slice reducers
import authSlice from './slices/authSlice';
import menuSlice from './slices/menuSlice';
import categoriesSlice from './slices/categoriesSlice';
import preparationSlice from './slices/preparationSlice';
import spicyLevelSlice from './slices/spicyLevelSlice';
import ordersSlice from './slices/ordersSlice';
import usersSlice from './slices/usersSlice';
import reviewsSlice from './slices/reviewsSlice';
import dashboardSlice from './slices/dashboardSlice';
import reportsSlice from './slices/reportsSlice';
import newsletterSlice from './slices/newsletterSlice';
import contactsSlice from './slices/contactsSlice';
import uiSlice from './slices/uiSlice';

// Configure the store
export const store = configureStore({
  reducer: {
    auth: authSlice,
    menu: menuSlice,
    categories: categoriesSlice,
    preparations: preparationSlice,
    spicyLevels: spicyLevelSlice,
    orders: ordersSlice,
    users: usersSlice,
    reviews: reviewsSlice,
    dashboard: dashboardSlice,
    reports: reportsSlice,
    newsletter: newsletterSlice,
    contacts: contactsSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
