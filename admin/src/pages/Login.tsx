import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Utensils, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

type LoginFormData = yup.InferType<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, clearAuthError } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component mounts
  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  const onSubmit = async (data: LoginFormData) => {
    clearAuthError();
    const result = await login(data);

    if (result.success) {
      toast({
        title: 'Login successful',
        description: 'Welcome to the admin panel!',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Login failed',
        description: result.error || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-warm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Utensils className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Restaurant Admin</CardTitle>
            <CardDescription>Sign in to manage your restaurant</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@restaurant.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs">
              <p><strong>Super Admin:</strong> superadmin@peppinos.com / SuperAdmin123</p>
              <p><strong>Veg Admin:</strong> vegadmin@peppinos.com / VegAdmin123</p>
              <p><strong>Non-Veg Admin:</strong> nonvegadmin@peppinos.com / NonVegAdmin123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};