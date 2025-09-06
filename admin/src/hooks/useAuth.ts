import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  fetchUserProfile,
  updateUserProfile,
  clearError,
  setCredentials,
  clearCredentials
} from '../store/slices/authSlice';
import type { User } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { 
    user, 
    accessToken, 
    refreshToken, 
    isAuthenticated, 
    isLoading, 
    error 
  } = useAppSelector((state) => state.auth);

  // Initialize auth state on app load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');

    if (token && userData && !user) {
      try {
        const parsedUser = JSON.parse(userData);
        dispatch(setCredentials({
          user: parsedUser,
          accessToken: token,
          refreshToken: localStorage.getItem('refreshToken') || undefined,
        }));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        dispatch(clearCredentials());
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  }, [dispatch, user]);

  // Login function
  const login = async (credentials: { email: string; password: string }) => {
    try {
      const result = await dispatch(loginUser(credentials));
      if (loginUser.fulfilled.match(result)) {
        return { success: true, data: result.payload };
      } else {
        return { success: false, error: result.payload as string };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  // Register function
  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
  }) => {
    try {
      const result = await dispatch(registerUser(userData));
      if (registerUser.fulfilled.match(result)) {
        return { success: true, data: result.payload };
      } else {
        return { success: false, error: result.payload as string };
      }
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await dispatch(logoutUser());
      dispatch(clearCredentials());
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Logout failed' };
    }
  };

  // Update profile function
  const updateProfile = async (userData: Partial<User>) => {
    try {
      const result = await dispatch(updateUserProfile(userData));
      if (updateUserProfile.fulfilled.match(result)) {
        return { success: true, data: result.payload };
      } else {
        return { success: false, error: result.payload as string };
      }
    } catch (error) {
      return { success: false, error: 'Profile update failed' };
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    try {
      const result = await dispatch(fetchUserProfile());
      if (fetchUserProfile.fulfilled.match(result)) {
        return { success: true, data: result.payload };
      } else {
        return { success: false, error: result.payload as string };
      }
    } catch (error) {
      return { success: false, error: 'Failed to refresh profile' };
    }
  };

  // Clear error function
  const clearAuthError = () => {
    dispatch(clearError());
  };

  // Check if user has specific role
  const hasRole = (role: string | string[]) => {
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  };

  // Check if user is admin (any admin role)
  const isAdmin = () => {
    return hasRole(['super-admin', 'veg-admin', 'non-veg-admin']);
  };

  // Check if user is super admin
  const isSuperAdmin = () => {
    return hasRole('super-admin');
  };

  // Check if user can manage vegetarian products
  const canManageVeg = () => {
    return hasRole(['super-admin', 'veg-admin']);
  };

  // Check if user can manage non-vegetarian products
  const canManageNonVeg = () => {
    return hasRole(['super-admin', 'non-veg-admin']);
  };

  // Check if user can manage specific product based on type
  const canManageProduct = (isVegetarian: boolean) => {
    if (isSuperAdmin()) return true;
    if (isVegetarian) return canManageVeg();
    return canManageNonVeg();
  };

  // Get user display name
  const getDisplayName = () => {
    return user?.name || 'User';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
    clearAuthError,

    // Permissions
    hasRole,
    isAdmin,
    isSuperAdmin,
    canManageVeg,
    canManageNonVeg,
    canManageProduct,

    // Utilities
    getDisplayName,
    getUserInitials,
  };
};
