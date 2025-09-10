import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchUsers,
  updateUser,
  updateUserStatus,
  updateUserRole,
  fetchUserStats,
  deleteUser,
  clearError,
  resetFilters
} from '@/store/slices/usersSlice';
import { useAlert } from '@/hooks/useAlert';
import { formatters } from '@/utils/exportUtils';
import {
  Search,
  Edit,
  Eye,
  Filter,
  UserCheck,
  UserX,
  Mail,
  Phone,
  X,
  Grid3X3,
  LayoutGrid,
  Users as UsersIcon,
  Crown,
  Leaf,
  Utensils,
  RefreshCw,
  Trash2
} from 'lucide-react';

export const Users: React.FC = () => {
  const dispatch = useAppDispatch();
  const { showAlert } = useAlert();
  const { isSuperAdmin } = useAuth();
  const { users, isLoading, error } = useAppSelector((state) => state.users);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVerification, setSelectedVerification] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Dialog states
  const [roleUpdateDialog, setRoleUpdateDialog] = useState<{
    open: boolean;
    user: any;
    newRole: string;
  }>({
    open: false,
    user: null,
    newRole: ''
  });

  const [statusUpdateDialog, setStatusUpdateDialog] = useState<{
    open: boolean;
    user: any;
    newStatus: boolean;
  }>({
    open: false,
    user: null,
    newStatus: false
  });

  const [viewUserDialog, setViewUserDialog] = useState<{
    open: boolean;
    user: any;
  }>({
    open: false,
    user: null
  });

  const [editUserDialog, setEditUserDialog] = useState<{
    open: boolean;
    user: any;
  }>({
    open: false,
    user: null
  });

  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    open: boolean;
    user: any;
  }>({
    open: false,
    user: null
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    isActive: true
  });

  useEffect(() => {
    dispatch(fetchUsers({
      search: searchTerm,
      role: selectedRole !== 'all' ? selectedRole : '',
      isActive: selectedStatus !== 'all' ? selectedStatus === 'active' : undefined,
      isEmailVerified: selectedVerification !== 'all' ? selectedVerification === 'verified' : undefined,
      sortBy,
      sortOrder
    }));
    dispatch(fetchUserStats({}));
  }, [dispatch, searchTerm, selectedRole, selectedStatus, selectedVerification, sortBy, sortOrder]);

  // Handle error display
  useEffect(() => {
    if (error) {
      showAlert(error, 'error', 'Error');
      dispatch(clearError());
    }
  }, [error, showAlert, dispatch]);

  // Export configuration
  const exportColumns = [
    { key: 'name', label: 'Name', width: 25 },
    { key: 'email', label: 'Email', width: 30 },
    { key: 'phoneNumber', label: 'Phone', width: 20, formatter: (value: string) => value || 'N/A' },
    { key: 'role', label: 'Role', width: 20, formatter: (value: string) => value.replace('-', ' ').toUpperCase() },
    { key: 'isActive', label: 'Status', width: 15, formatter: formatters.status },
    { key: 'isEmailVerified', label: 'Email Verified', width: 15, formatter: formatters.boolean },
    { key: 'stats.orderCount', label: 'Orders', width: 15, formatter: (_value: any, row: any) => row.stats?.orderCount || 0 },
    { key: 'stats.totalSpent', label: 'Total Spent', width: 20, formatter: (_value: any, row: any) => formatters.currency(row.stats?.totalSpent || 0) },
    { key: 'createdAt', label: 'Joined Date', width: 20, formatter: formatters.date }
  ];

  const exportData = users.map(user => ({
    ...user,
    role: user.role.replace('-', ' ').toUpperCase(),
    isActive: user.isActive ? 'Active' : 'Inactive',
    isEmailVerified: user.isEmailVerified ? 'Yes' : 'No'
  }));

  // Utility functions


  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin':
        return <Crown className="h-4 w-4" />;
      case 'veg-admin':
        return <Leaf className="h-4 w-4" />;
      case 'non-veg-admin':
        return <Utensils className="h-4 w-4" />;
      case 'customer':
        return <UsersIcon className="h-4 w-4" />;
      case 'guest':
        return <Eye className="h-4 w-4" />;
      default:
        return <UsersIcon className="h-4 w-4" />;
    }
  };

  // Utility functions
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200';
      case 'veg-admin':
        return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200';
      case 'non-veg-admin':
        return 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200';
      case 'customer':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200';
      case 'guest':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200';
  };

  // Action handlers
  const handleView = (user: any) => {
    setViewUserDialog({ open: true, user });
  };

  const handleEdit = (user: any) => {
    setEditFormData({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      isActive: user.isActive
    });
    setEditUserDialog({ open: true, user });
  };

  const handleUpdateUser = async () => {
    if (!editUserDialog.user) return;

    try {
      const result = await dispatch(updateUser({
        userId: editUserDialog.user._id,
        userData: editFormData
      }));

      if (updateUser.fulfilled.match(result)) {
        showAlert('User updated successfully', 'success', 'Success');
        setEditUserDialog({ open: false, user: null });
      }
    } catch (error) {
      showAlert('Failed to update user', 'error', 'Error');
    }
  };

  const handleStatusUpdate = async (user: any, newStatus: boolean) => {
    setStatusUpdateDialog({ open: true, user, newStatus });
  };

  const confirmStatusUpdate = async () => {
    if (!statusUpdateDialog.user) return;

    try {
      const result = await dispatch(updateUserStatus({
        userId: statusUpdateDialog.user._id,
        isActive: statusUpdateDialog.newStatus
      }));

      if (updateUserStatus.fulfilled.match(result)) {
        showAlert(
          `User ${statusUpdateDialog.newStatus ? 'activated' : 'deactivated'} successfully`,
          'success',
          'Success'
        );
        setStatusUpdateDialog({ open: false, user: null, newStatus: false });
      }
    } catch (error) {
      showAlert('Failed to update user status', 'error', 'Error');
    }
  };

  const handleRoleUpdate = (user: any) => {
    setRoleUpdateDialog({ open: true, user, newRole: user.role });
  };

  const confirmRoleUpdate = async () => {
    if (!roleUpdateDialog.user || !roleUpdateDialog.newRole) return;

    try {
      const result = await dispatch(updateUserRole({
        userId: roleUpdateDialog.user._id,
        role: roleUpdateDialog.newRole
      }));

      if (updateUserRole.fulfilled.match(result)) {
        showAlert('User role updated successfully', 'success', 'Success');
        setRoleUpdateDialog({ open: false, user: null, newRole: '' });
      }
    } catch (error) {
      showAlert('Failed to update user role', 'error', 'Error');
    }
  };

  const handleDeleteUser = (user: any) => {
    setDeleteUserDialog({ open: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserDialog.user) return;

    try {
      await dispatch(deleteUser(deleteUserDialog.user._id)).unwrap();
      setDeleteUserDialog({ open: false, user: null });
      showAlert('User deleted successfully', 'success', 'Success');

      // Refresh the users list
      dispatch(fetchUsers({
        page: 1,
        limit: 20,
        search: searchTerm,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        isActive: selectedStatus !== 'all' ? selectedStatus === 'active' : undefined,
        isEmailVerified: selectedVerification !== 'all' ? selectedVerification === 'verified' : undefined,
        sortBy,
        sortOrder
      }));
    } catch (error) {
      showAlert('Failed to delete user', 'error', 'Error');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setSelectedStatus('all');
    setSelectedVerification('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    dispatch(resetFilters());
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading users</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            data={exportData}
            columns={exportColumns}
            filename="users"
            title="Users Export"
            subtitle={`Total users: ${users.length}`}
            disabled={isLoading || users.length === 0}
          />

          <Button variant="outline" onClick={() => dispatch(fetchUsers({}))}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Main Filters Row */}
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                  <SelectItem value="veg-admin">Veg Admin</SelectItem>
                  <SelectItem value="non-veg-admin">Non-Veg Admin</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

             

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>

              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Join Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="lastLogin">Last Login</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort Order</label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest First</SelectItem>
                        <SelectItem value="asc">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">View Mode</label>
                    <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'table' | 'grid')}>
                      <ToggleGroupItem value="table" aria-label="Table view">
                        <LayoutGrid className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="grid" aria-label="Grid view">
                        <Grid3X3 className="h-4 w-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading users...
            </div>
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              No users found
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          {user.phoneNumber && (
                            <div className="text-xs text-muted-foreground">{user.phoneNumber}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          {user.role.replace('-', ' ').toUpperCase()}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={(checked) => handleStatusUpdate(user, checked)}
                          disabled={user.role === 'super-admin' && !isSuperAdmin()}
                        />
                        <Badge className={getStatusBadgeColor(user.isActive)}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium">{user.stats?.orderCount || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatters.currency(user.stats?.totalSpent || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatters.date(user.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleView(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View user details</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit user</p>
                          </TooltipContent>
                        </Tooltip>

                        {isSuperAdmin() && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleRoleUpdate(user)}>
                                  <Crown className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Update user role</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete user</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
          <Card key={user._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <CardDescription className="text-sm">{user.email}</CardDescription>
                  </div>
                </div>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {user.role.replace('-', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={getStatusBadgeColor(user.isActive)}>
                  {user.isActive ? (
                    <>
                      <UserCheck className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <UserX className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
              </div>
              
              {user.phoneNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {user.phoneNumber}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {user.isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
              </div>

              <div className="text-xs text-muted-foreground">
                Joined: {formatters.date(user.createdAt)}
              </div>

              <div className="flex gap-2 pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleView(user)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View user details</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit user</p>
                  </TooltipContent>
                </Tooltip>

                {isSuperAdmin() && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleRoleUpdate(user)}>
                          <Crown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Update user role</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete user</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Role Update Dialog */}
      <Dialog open={roleUpdateDialog.open} onOpenChange={(open) => setRoleUpdateDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the role for {roleUpdateDialog.user?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={roleUpdateDialog.newRole}
              onValueChange={(value) => setRoleUpdateDialog(prev => ({ ...prev, newRole: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="veg-admin">Veg Admin</SelectItem>
                <SelectItem value="non-veg-admin">Non-Veg Admin</SelectItem>
                {isSuperAdmin() && (
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRoleUpdateDialog({ open: false, user: null, newRole: '' })}>
                Cancel
              </Button>
              <Button onClick={confirmRoleUpdate}>
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialog.open} onOpenChange={(open) => setStatusUpdateDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Status</DialogTitle>
            <DialogDescription>
              {statusUpdateDialog.newStatus ? 'Activate' : 'Deactivate'} {statusUpdateDialog.user?.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStatusUpdateDialog({ open: false, user: null, newStatus: false })}>
              Cancel
            </Button>
            <Button onClick={confirmStatusUpdate}>
              {statusUpdateDialog.newStatus ? 'Activate' : 'Deactivate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewUserDialog.open} onOpenChange={(open) => setViewUserDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete user information
            </DialogDescription>
          </DialogHeader>

          {viewUserDialog.user && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{viewUserDialog.user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{viewUserDialog.user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-sm">{viewUserDialog.user.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <Badge className={getRoleBadgeColor(viewUserDialog.user.role)}>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(viewUserDialog.user.role)}
                      {viewUserDialog.user.role.replace('-', ' ').toUpperCase()}
                    </div>
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className={getStatusBadgeColor(viewUserDialog.user.isActive)}>
                    {viewUserDialog.user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
                  <p className="text-sm">{viewUserDialog.user.isEmailVerified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Orders</label>
                  <p className="text-sm">{viewUserDialog.user.stats?.orderCount || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Spent</label>
                  <p className="text-sm">{formatters.currency(viewUserDialog.user.stats?.totalSpent || 0)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                  <p className="text-sm">{formatters.date(viewUserDialog.user.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                  <p className="text-sm">{viewUserDialog.user.lastLogin ? formatters.date(viewUserDialog.user.lastLogin) : 'Never'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialog.open} onOpenChange={(open) => setEditUserDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {editUserDialog.user?.name}
            </DialogDescription>
          </DialogHeader>

          {editUserDialog.user && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Phone</label>
                <Input
                  value={editFormData.phoneNumber}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Status</label>
                <Switch
                  checked={editFormData.isActive}
                  onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditUserDialog({ open: false, user: null })}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser}>
                  Update User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserDialog.open} onOpenChange={(open) => setDeleteUserDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteUserDialog.user && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900">
                      {deleteUserDialog.user.name}
                    </p>
                    <p className="text-sm text-red-700">
                      {deleteUserDialog.user.email}
                    </p>
                    <p className="text-xs text-red-600">
                      Role: {deleteUserDialog.user.role}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>⚠️ This will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Mark the user as inactive</li>
                  <li>Prevent them from logging in</li>
                  <li>Preserve their order history</li>
                  <li>Cannot be undone</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteUserDialog({ open: false, user: null })}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteUser}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};
