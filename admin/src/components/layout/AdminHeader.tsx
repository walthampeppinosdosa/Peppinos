import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-gradient-primary text-primary-foreground';
      case 'veg_admin':
        return 'bg-success text-success-foreground';
      case 'nonveg_admin':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'veg_admin':
        return 'Veg Admin';
      case 'nonveg_admin':
        return 'Non-Veg Admin';
      default:
        return role;
    }
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
          
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};