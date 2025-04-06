import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireVoter?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireVoter = false 
}: ProtectedRouteProps) {
  const { isInitialized, isAdmin, isVoter, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) {
      checkAuth();
    }
  }, [isInitialized, checkAuth]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireVoter && !isVoter) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  return <>{children}</>;
} 