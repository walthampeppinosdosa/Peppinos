import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Users,
  MapPin,
  BarChart3,
  Settings,
  Utensils,
  Leaf,
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
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium shadow-warm" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

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
          <SidebarGroupLabel className="text-sidebar-foreground/70">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-3 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role !== 'super_admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">Quick Access</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/products/new" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
                      <Package className="mr-3 h-4 w-4" />
                      {!isCollapsed && <span>Add Product</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user?.role === 'veg_admin' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton className="text-success hover:text-success/80">
                      <Leaf className="mr-3 h-4 w-4" />
                      {!isCollapsed && <span>Veg Products</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};