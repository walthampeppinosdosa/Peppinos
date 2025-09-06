import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FolderOpen,
  ShoppingCart,
  Users,
  MapPin,
  BarChart3,
  Utensils,
  Menu as MenuIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Menu Management',
    url: '/menu',
    icon: MenuIcon,
    roles: ['veg-admin', 'non-veg-admin', 'super-admin'],
  },
  {
    title: 'Categories',
    url: '/categories',
    icon: FolderOpen,
    roles: ['veg-admin', 'non-veg-admin', 'super-admin'],
  },
  {
    title: 'Orders',
    url: '/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
    roles: ['veg-admin', 'non-veg-admin', 'super-admin'],
  },
  {
    title: 'Addresses',
    url: '/addresses',
    icon: MapPin,
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: BarChart3,
  },
];

export const AdminSidebar: React.FC = () => {
  const { state } = useSidebar();
  const { user } = useAuth();

  const canAccessRoute = (item: NavItem) => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  };

  const filteredNavItems = navItems.filter(canAccessRoute);
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-sidebar-foreground">FoodAdmin</h2>
                <p className="text-xs text-sidebar-foreground/60">Restaurant Management</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-warm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-white dark:hover:text-white"
                        }`
                      }
                    >
                      <item.icon className="mr-3 h-4 w-4 dark:text-white" />
                      {!isCollapsed && (
                        <span className="dark:text-white">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};