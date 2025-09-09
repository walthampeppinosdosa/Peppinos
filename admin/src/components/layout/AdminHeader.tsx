import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Sun, Moon, Menu, Plus, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from 'next-themes';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-gradient-primary text-primary-foreground';
      case 'veg-admin':
        return 'bg-success text-success-foreground';
      case 'non-veg-admin':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'Super Admin';
      case 'veg-admin':
        return 'Veg Admin';
      case 'non-veg-admin':
        return 'Non-Veg Admin';
      default:
        return role;
    }
  };

  const canManageMenu = () => {
    return user?.role && ['super-admin', 'veg-admin', 'non-veg-admin'].includes(user.role);
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 shadow-soft">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="hidden sm:block">
          <h1 className="text-xl font-semibold text-foreground">Restaurant Admin Panel</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* {canManageMenu() && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/menu" className="flex items-center w-full text-foreground hover:text-foreground">
                  <List className="h-4 w-4 mr-2" />
                  View Menu
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/menu/new" className="flex items-center w-full text-foreground hover:text-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Menu Item
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )} */}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <Badge className={getRoleColor(user?.role || '')} variant="secondary">
              {getRoleLabel(user?.role || '')}
            </Badge>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => setLogoutDialogOpen(true)}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to logout? This will end your admin session.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLogoutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setLogoutDialogOpen(false);
                  logout();
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};