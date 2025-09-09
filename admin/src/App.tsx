import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AlertProvider } from "@/hooks/useAlert";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { AddMenuItem } from "./pages/AddMenuItem";
import { ViewMenuItem } from "./pages/ViewMenuItem";
import { Menu } from "./pages/Menu";
import { Categories } from "./pages/Categories";
import { AddCategory } from "./pages/AddCategory";
import { ViewCategory } from "./pages/ViewCategory";
import { Orders } from "./pages/Orders";
import { Users } from "./pages/Users";
import { Reports } from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AlertProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/menu/new" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <AddMenuItem />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/menu/edit/:id" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <AddMenuItem />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/menu/view/:id" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <ViewMenuItem />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/menu" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <Menu />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/categories" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <Categories />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/categories/new" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <AddCategory />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/categories/:id" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <ViewCategory />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/categories/:id/edit" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <AddCategory />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Orders />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <Users />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/users/view/:id" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <Users />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/users/edit/:id" element={
              <ProtectedRoute roles={['veg-admin', 'non-veg-admin', 'super-admin']}>
                <AdminLayout>
                  <Users />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Reports />
                </AdminLayout>
              </ProtectedRoute>
            } />
        
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </AlertProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
