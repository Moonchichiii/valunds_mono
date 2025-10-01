import { useAuthStatus } from '@/features/accounts/api/auth';
import { Outlet, useRouter } from '@tanstack/react-router';
import React, { useEffect } from 'react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStatus();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void router.navigate({ to: '/login' });
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nordic-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
};
