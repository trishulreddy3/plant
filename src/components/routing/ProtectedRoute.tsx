import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireAuth = true,
  redirectTo = '/'
}) => {
  const { user } = useAuth();
  const location = useLocation();

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    console.log('Access denied: User not authenticated, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If user is logged in but shouldn't access this route (like login page)
  if (!requireAuth && user) {
    console.log('User already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // If specific roles are required, check user role
  if (requireAuth && user && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      console.log(`Access denied: User role '${user.role}' not in allowed roles:`, allowedRoles);
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
